import { useState, useMemo } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, Filter, Download, Search, Activity } from 'lucide-react';

interface DataRow {
  id: number;
  block: string;
  ioName: string;
  blockType: string;
  value: number;
  signal: number;
  interlock: string;
  chart: string;
}

const RockwellAnalyzer = () => {
  const [l5kFile, setL5kFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [data, setData] = useState<DataRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    alarmType: 'all',
    enabledStatus: 'all',
    hasInterlock: 'all'
  });

  // Simula processamento dos arquivos
  const processFiles = async () => {
    if (!l5kFile || !csvFile) {
      alert('Por favor, selecione ambos os arquivos');
      return;
    }

    setProcessing(true);
    
    // Simula delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Dados de exemplo para demonstração
    const sampleData = [
      { id: 1, block: 'TE1611001_ALM', ioName: 'HHInAlarm', blockType: 'IHMALMA_2780', value: 85.5, signal: 1, interlock: 'M1611001_MTR / XV1611001', chart: 'R_Control_Bombas' },
      { id: 2, block: 'TE1611001_ALM', ioName: 'HInAlarm', blockType: 'IHMALMA_2780', value: 80.0, signal: 1, interlock: '', chart: 'R_Control_Bombas' },
      { id: 3, block: 'TE1611001_ALM', ioName: 'LInAlarm', blockType: 'IHMALMA_2780', value: 20.0, signal: 0, interlock: '', chart: 'R_Control_Bombas' },
      { id: 4, block: 'TE1611001_ALM', ioName: 'LLInAlarm', blockType: 'IHMALMA_2780', value: 15.0, signal: 1, interlock: 'M1611001_MTR', chart: 'R_Control_Bombas' },
      { id: 5, block: 'PT1611002_ALM', ioName: 'HHInAlarm', blockType: 'IHMALMA', value: 120.5, signal: 1, interlock: 'XV1611002 / PMP1611001', chart: 'R_Valvulas' },
      { id: 6, block: 'PT1611002_ALM', ioName: 'HInAlarm', blockType: 'IHMALMA', value: 110.0, signal: 1, interlock: '', chart: 'R_Valvulas' },
      { id: 7, block: 'PT1611002_ALM', ioName: 'LInAlarm', blockType: 'IHMALMA', value: 30.0, signal: 1, interlock: 'XV1611003', chart: 'R_Valvulas' },
      { id: 8, block: 'PT1611002_ALM', ioName: 'LLInAlarm', blockType: 'IHMALMA', value: 20.0, signal: 0, interlock: '', chart: 'R_Valvulas' },
      { id: 9, block: 'FT1611003_ALM', ioName: 'HHInAlarm', blockType: 'IHMALMA_2780', value: 95.0, signal: 1, interlock: 'M1611002_MTR', chart: 'R_Tanques' },
      { id: 10, block: 'FT1611003_ALM', ioName: 'HInAlarm', blockType: 'IHMALMA_2780', value: 85.0, signal: 0, interlock: '', chart: 'R_Tanques' },
      { id: 11, block: 'LT1611004_ALM', ioName: 'HHInAlarm', blockType: 'IHMALMA', value: 8.5, signal: 1, interlock: 'PMP1611002 / XV1611004', chart: 'R_Tanques' },
      { id: 12, block: 'LT1611004_ALM', ioName: 'LLInAlarm', blockType: 'IHMALMA', value: 1.5, signal: 1, interlock: 'M1611003_MTR', chart: 'R_Tanques' },
    ];
    
    setData(sampleData);
    setProcessing(false);
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
          item.chart.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtro de tipo de alarme
      if (filters.alarmType !== 'all' && item.ioName !== filters.alarmType) {
        return false;
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
    return {
      total: filtered.length,
      enabled: filtered.filter(d => d.signal === 1).length,
      disabled: filtered.filter(d => d.signal === 0).length,
      withInterlock: filtered.filter(d => d.interlock).length,
      hhAlarms: filtered.filter(d => d.ioName === 'HHInAlarm').length,
      hAlarms: filtered.filter(d => d.ioName === 'HInAlarm').length,
      lAlarms: filtered.filter(d => d.ioName === 'LInAlarm').length,
      llAlarms: filtered.filter(d => d.ioName === 'LLInAlarm').length,
    };
  }, [filteredData]);

  // Download CSV
  const downloadCSV = () => {
    if (filteredData.length === 0) return;

    const headers = ['Block', 'I/O Name', 'Block Type', 'Value', 'Signal', 'Interlock', 'Chart'];
    const csv = [
      headers.join(';'),
      ...filteredData.map(row => [
        row.block,
        row.ioName,
        row.blockType,
        row.value,
        row.signal,
        row.interlock,
        row.chart
      ].join(';'))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rockwell_analysis_filtered.csv';
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

                {/* Alarm Type */}
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Tipo de Alarme</label>
                  <select
                    value={filters.alarmType}
                    onChange={(e) => setFilters({...filters, alarmType: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value="HHInAlarm">HH Alarm</option>
                    <option value="HInAlarm">H Alarm</option>
                    <option value="LInAlarm">L Alarm</option>
                    <option value="LLInAlarm">LL Alarm</option>
                  </select>
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

            {/* Download Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={downloadCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar Resultados ({stats.total})
              </button>
            </div>

            {/* Data Table */}
            <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Block</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Alarme</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Interbloqueio</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Chart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-750 transition-colors">
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
                        <td className="px-6 py-4 text-sm text-slate-300">{row.blockType}</td>
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
                        <td className="px-6 py-4 text-sm text-slate-400">{row.chart}</td>
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