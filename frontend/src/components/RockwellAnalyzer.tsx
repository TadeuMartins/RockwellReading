import { useState, useMemo, useRef, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, Filter, Download, Search, Activity, ChevronDown } from 'lucide-react';

interface DataRow {
  id: number;
  hierarc: string;
  chart: string;
  block: string;
  ioName: string;
  blockType: string;
  value: number;
  signal: number;
  interlock: string;
  rungName: string;
  identification: string;
  unit: string;
}

const RockwellAnalyzer = () => {
  const [l5kFile, setL5kFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [data, setData] = useState<DataRow[]>([]);
  const [rawData, setRawData] = useState<any[]>([]); // Store original backend data for CSV export
  const [columnOrder, setColumnOrder] = useState<string[]>([]); // Store exact column order from backend
  const [processing, setProcessing] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    alarmTypes: [] as string[], // Array for multi-selection
    enabledStatus: 'all',
    hasInterlock: 'all'
  });
  const [isAlarmTypeDropdownOpen, setIsAlarmTypeDropdownOpen] = useState(false);
  const alarmTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alarmTypeDropdownRef.current && !alarmTypeDropdownRef.current.contains(event.target as Node)) {
        setIsAlarmTypeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper functions for multi-select alarm type
  const alarmTypeOptions = [
    { value: 'HHInAlarm', label: 'HH Alarm' },
    { value: 'HInAlarm', label: 'H Alarm' },
    { value: 'LInAlarm', label: 'L Alarm' },
    { value: 'LLInAlarm', label: 'LL Alarm' },
    { value: 'others', label: 'Outros' }
  ];

  const toggleAlarmType = (value: string) => {
    setFilters(prev => ({
      ...prev,
      alarmTypes: prev.alarmTypes.includes(value)
        ? prev.alarmTypes.filter(t => t !== value)
        : [...prev.alarmTypes, value]
    }));
  };

  const getAlarmTypeLabel = () => {
    if (filters.alarmTypes.length === 0) return 'Todos';
    if (filters.alarmTypes.length === 1) {
      const option = alarmTypeOptions.find(o => o.value === filters.alarmTypes[0]);
      return option?.label || 'Todos';
    }
    return `${filters.alarmTypes.length} selecionados`;
  };

  // Processa os arquivos via API backend
  const processFiles = async () => {
    if (!l5kFile || !csvFile) {
      alert('Por favor, selecione ambos os arquivos');
      return;
    }

    setProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('l5k_file', l5kFile);
      formData.append('csv_file', csvFile);

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Erro ao processar arquivos';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          // If response is not JSON, use the text directly
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.success) {
        // Mapeia os dados do backend para o formato esperado pelo frontend
        if (!result.data || !Array.isArray(result.data)) {
          throw new Error('Resposta do servidor em formato inválido');
        }
        
        const mappedData = result.data.map((row: any, index: number) => ({
          id: index + 1,
          hierarc: row.Hierarc || '',
          chart: row.Chart || '',
          block: row.Block || '',
          ioName: row['I/O name'] || '',
          blockType: row['Block type'] || '',
          value: row.Value !== null && row.Value !== undefined ? row.Value : 0,
          signal: row.Signal !== null && row.Signal !== undefined ? row.Signal : 0,
          interlock: row['Text 0'] || '',
          rungName: row['Rung Name'] || '',
          identification: row.Identification || '',
          unit: row.Unit || '',
        }));
        
        // Store original data for CSV export with exact column names and order
        setRawData(result.data);
        setColumnOrder(result.columns || Object.keys(result.data[0] || {}));
        setData(mappedData);
        
        // Success message
        console.log(`✓ Processamento concluído com sucesso: ${mappedData.length} registros`);
      } else {
        throw new Error(result.error || 'Erro desconhecido no processamento');
      }
    } catch (error) {
      console.error('Erro detalhado:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // More specific error message
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        alert('Erro ao conectar com o servidor. Certifique-se de que o backend está rodando em http://localhost:5000');
      } else {
        alert('Erro ao processar os arquivos: ' + errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  // Dados filtrados
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Filtro de busca
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          item.block.toLowerCase().includes(searchLower) ||
          item.ioName.toLowerCase().includes(searchLower) ||
          item.interlock.toLowerCase().includes(searchLower) ||
          item.rungName.toLowerCase().includes(searchLower) ||
          item.chart.toLowerCase().includes(searchLower) ||
          item.hierarc.toLowerCase().includes(searchLower) ||
          item.identification.toLowerCase().includes(searchLower) ||
          item.unit.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtro de tipo de alarme (seleção múltipla)
      if (filters.alarmTypes.length > 0) {
        const limitTypes = ['HHInAlarm', 'HInAlarm', 'LInAlarm', 'LLInAlarm'];
        
        // Check if "Outros" is selected
        const hasOthers = filters.alarmTypes.includes('others');
        // Get specific alarm types (excluding "others")
        const specificTypes = filters.alarmTypes.filter(t => t !== 'others');
        
        let matchesAlarmType = false;
        
        // If "Outros" is selected and item is not a limit type
        if (hasOthers && !limitTypes.includes(item.ioName)) {
          matchesAlarmType = true;
        }
        
        // If any specific type matches
        if (specificTypes.includes(item.ioName)) {
          matchesAlarmType = true;
        }
        
        if (!matchesAlarmType) {
          return false;
        }
      }

      // Filtro de status habilitado
      if (filters.enabledStatus === 'enabled' && item.signal !== 1) return false;
      if (filters.enabledStatus === 'disabled' && item.signal !== 0) return false;

      // Filtro de interbloqueio
      if (filters.hasInterlock === 'yes' && !item.interlock) return false;
      if (filters.hasInterlock === 'no' && item.interlock) return false;

      return true;
    });
  }, [data, filters]);

  // Estatísticas
  const stats = useMemo(() => {
    const filtered = filteredData;
    const limitTypes = ['HHInAlarm', 'HInAlarm', 'LInAlarm', 'LLInAlarm'];
    return {
      total: filtered.length,
      enabled: filtered.filter(d => d.signal === 1).length,
      disabled: filtered.filter(d => d.signal === 0).length,
      withInterlock: filtered.filter(d => d.interlock).length,
      hhAlarms: filtered.filter(d => d.ioName === 'HHInAlarm').length,
      hAlarms: filtered.filter(d => d.ioName === 'HInAlarm').length,
      lAlarms: filtered.filter(d => d.ioName === 'LInAlarm').length,
      llAlarms: filtered.filter(d => d.ioName === 'LLInAlarm').length,
      othersAlarms: filtered.filter(d => !limitTypes.includes(d.ioName)).length,
    };
  }, [filteredData]);

  // Download CSV - Formato Original (backend format with exact column names)
  const downloadOriginalCSV = () => {
    if (filteredData.length === 0 || rawData.length === 0) return;

    // Create a set of IDs from filtered data for lookup
    const filteredIds = new Set(filteredData.map(row => row.id));
    
    // Filter raw data based on filtered IDs (id is index + 1)
    const filteredRawData = rawData.filter((_, index) => filteredIds.has(index + 1));
    
    if (filteredRawData.length === 0) return;

    // Use the exact column order from backend to preserve original CSV structure
    const headers = columnOrder.length > 0 ? columnOrder : Object.keys(filteredRawData[0]);
    
    // Build CSV with original column names in exact order
    const csv = [
      headers.join(';'),
      ...filteredRawData.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle null/undefined values
          return value !== null && value !== undefined ? value : '';
        }).join(';')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rockwell_processado.csv';
    link.click();
  };

  // Download CSV - Vista Frontend (as displayed in the UI)
  const downloadViewCSV = () => {
    if (filteredData.length === 0) return;

    // Headers as displayed in frontend (Portuguese)
    const headers = ['Hierarc', 'Chart', 'Block', 'Alarme', 'Valor', 'Status', 'Interbloqueio', 'Nome do Rung', 'Identification', 'Unit'];
    
    const csv = [
      headers.join(';'),
      ...filteredData.map(row => [
        row.hierarc,
        row.chart,
        row.block,
        row.ioName,
        row.value,
        row.signal === 1 ? 'Habilitado' : 'Desabilitado',
        row.interlock || '',
        row.rungName || '',
        row.identification,
        row.unit
      ].join(';'))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rockwell_visualizacao.csv';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-2xl p-8 mb-6">
          <div className="flex items-center gap-4">
            <Activity className="w-12 h-12 text-white" />
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Rockwell AOI Analyzer</h1>
              <p className="text-blue-100 text-lg">Análise Avançada de Alarmes e Interbloqueios</p>
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* L5K File */}
          <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700 hover:border-blue-500 transition-all">
            <label className="flex flex-col items-center justify-center cursor-pointer group">
              <input
                type="file"
                accept=".l5k,.L5K"
                className="hidden"
                onChange={(e) => setL5kFile(e.target.files?.[0] || null)}
              />
              <FileText className="w-16 h-16 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold text-white mb-2">Arquivo L5K</h3>
              <p className="text-slate-400 text-sm text-center mb-3">
                {l5kFile ? l5kFile.name : 'Clique para selecionar o arquivo Rockwell'}
              </p>
              {l5kFile && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Arquivo carregado
                </div>
              )}
            </label>
          </div>

          {/* CSV File */}
          <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700 hover:border-green-500 transition-all">
            <label className="flex flex-col items-center justify-center cursor-pointer group">
              <input
                type="file"
                accept=".csv,.CSV"
                className="hidden"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              <FileText className="w-16 h-16 text-green-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold text-white mb-2">Arquivo CSV Base</h3>
              <p className="text-slate-400 text-sm text-center mb-3">
                {csvFile ? csvFile.name : 'Clique para selecionar o arquivo COMOS'}
              </p>
              {csvFile && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Arquivo carregado
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Process Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={processFiles}
            disabled={!l5kFile || !csvFile || processing}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-600 disabled:to-slate-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed flex items-center gap-3"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processando...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Processar Arquivos
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {data.length > 0 && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-blue-100 font-semibold">Total</h3>
                  <Activity className="w-5 h-5 text-blue-200" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>

              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-green-100 font-semibold">Habilitados</h3>
                  <CheckCircle className="w-5 h-5 text-green-200" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.enabled}</p>
              </div>

              <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-red-100 font-semibold">Desabilitados</h3>
                  <XCircle className="w-5 h-5 text-red-200" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.disabled}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-purple-100 font-semibold">Interbloqueios</h3>
                  <AlertCircle className="w-5 h-5 text-purple-200" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.withInterlock}</p>
              </div>
            </div>

            {/* Alarm Type Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <h4 className="text-slate-400 text-sm mb-1">HH Alarms</h4>
                <p className="text-2xl font-bold text-red-400">{stats.hhAlarms}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <h4 className="text-slate-400 text-sm mb-1">H Alarms</h4>
                <p className="text-2xl font-bold text-orange-400">{stats.hAlarms}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <h4 className="text-slate-400 text-sm mb-1">L Alarms</h4>
                <p className="text-2xl font-bold text-yellow-400">{stats.lAlarms}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <h4 className="text-slate-400 text-sm mb-1">LL Alarms</h4>
                <p className="text-2xl font-bold text-blue-400">{stats.llAlarms}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <h4 className="text-slate-400 text-sm mb-1">Outros</h4>
                <p className="text-2xl font-bold text-purple-400">{stats.othersAlarms}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-800 rounded-xl shadow-lg p-6 mb-6 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-blue-400" />
                <h3 className="text-xl font-semibold text-white">Filtros</h3>
              </div>
              
              <div className="grid md:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Block, alarme, equipamento..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-10 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Alarm Type - Multi-select Dropdown */}
                <div ref={alarmTypeDropdownRef} className="relative">
                  <label className="block text-slate-400 text-sm mb-2">Tipo de Alarme</label>
                  <button
                    type="button"
                    onClick={() => setIsAlarmTypeDropdownOpen(!isAlarmTypeDropdownOpen)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 flex items-center justify-between hover:bg-slate-850 transition-colors"
                  >
                    <span>{getAlarmTypeLabel()}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isAlarmTypeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isAlarmTypeDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg shadow-lg overflow-hidden">
                      {alarmTypeOptions.map(option => (
                        <label
                          key={option.value}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-slate-800 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={filters.alarmTypes.includes(option.value)}
                            onChange={() => toggleAlarmType(option.value)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-2"
                          />
                          <span className="text-white text-sm">{option.label}</span>
                        </label>
                      ))}
                      {filters.alarmTypes.length > 0 && (
                        <div className="border-t border-slate-700 p-2">
                          <button
                            type="button"
                            onClick={() => setFilters({...filters, alarmTypes: []})}
                            className="w-full text-sm text-blue-400 hover:text-blue-300 py-1"
                          >
                            Limpar seleção
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Enabled Status */}
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Status</label>
                  <select
                    value={filters.enabledStatus}
                    onChange={(e) => setFilters({...filters, enabledStatus: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value="enabled">Habilitados</option>
                    <option value="disabled">Desabilitados</option>
                  </select>
                </div>

                {/* Interlock Status */}
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Interbloqueio</label>
                  <select
                    value={filters.hasInterlock}
                    onChange={(e) => setFilters({...filters, hasInterlock: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value="yes">Com Interbloqueio</option>
                    <option value="no">Sem Interbloqueio</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex justify-end gap-3 mb-4">
              <button
                onClick={downloadOriginalCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar CSV Original ({stats.total})
              </button>
              <button
                onClick={downloadViewCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar Vista Atual ({stats.total})
              </button>
            </div>

            {/* Data Table */}
            <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Hierarc</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Chart</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Block</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Alarme</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Interbloqueio</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome do Rung</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Identification</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-750 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-300">{row.hierarc}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{row.chart}</td>
                        <td className="px-6 py-4 text-sm font-medium text-white">{row.block}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            row.ioName === 'HHInAlarm' ? 'bg-red-900 text-red-200' :
                            row.ioName === 'HInAlarm' ? 'bg-orange-900 text-orange-200' :
                            row.ioName === 'LInAlarm' ? 'bg-yellow-900 text-yellow-200' :
                            'bg-blue-900 text-blue-200'
                          }`}>
                            {row.ioName}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300 font-mono">{row.value}</td>
                        <td className="px-6 py-4 text-sm">
                          {row.signal === 1 ? (
                            <span className="flex items-center gap-1 text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              Habilitado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400">
                              <XCircle className="w-4 h-4" />
                              Desabilitado
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {row.interlock || <span className="text-slate-500 italic">Nenhum</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {row.rungName || <span className="text-slate-500 italic">-</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{row.identification}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{row.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredData.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum resultado encontrado com os filtros aplicados</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RockwellAnalyzer;