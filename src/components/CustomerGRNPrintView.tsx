import React from 'react';
import { formatDate } from '@/lib/utils';

export const CustomerGRNPrintView: React.FC<{ grn: any, group: any, settings: any }> = ({ grn, group, settings }) => {
  return (
    <div id="grn-print-section" className="bg-white p-10 max-w-4xl mx-auto border" style={{ minHeight: '800px', color: '#000', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-6">
        <div className="w-1/2">
          {settings?.company_logo && (
            <img src={settings.company_logo} alt="Logo" className="h-16 mb-4 object-contain" />
          )}
          <h1 className="text-2xl font-black uppercase text-gray-900 tracking-tight">{settings?.company_name || 'REX ENGINEERING'}</h1>
          <p className="text-sm text-gray-600 mt-2 whitespace-pre-line leading-snug">
            {settings?.company_address || '123 Main Street\nCity, Country'}
          </p>
        </div>
        <div className="w-1/2 text-right">
          <h2 className="text-3xl font-black text-gray-300 uppercase tracking-widest mb-4">GOODS RECEIPT</h2>
          <div className="grid grid-cols-2 gap-2 text-sm max-w-xs ml-auto">
            <span className="text-gray-500 font-bold uppercase text-xs">GRN No:</span>
            <span className="font-bold">{grn.id}</span>
            <span className="text-gray-500 font-bold uppercase text-xs">Date:</span>
            <span className="font-bold">{formatDate(grn.receivedAt || grn.createdAt)}</span>
            <span className="text-gray-500 font-bold uppercase text-xs">Quotation Ref:</span>
            <span className="font-bold">{group.quoNo}</span>
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="mb-10 bg-gray-50 p-6 rounded-lg border border-gray-100">
        <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3">Received From</h3>
        <p className="text-lg font-bold text-gray-900">{group.leadName || 'Customer'}</p>
        {group.leadCompany && <p className="text-gray-600">{group.leadCompany}</p>}
      </div>

      {/* Items Table */}
      <div className="mb-10">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-xs rounded-tl-lg">Description of Items Received</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-4 px-4 border-b border-l border-r border-gray-200">
                <pre className="font-sans whitespace-pre-wrap text-gray-800">{grn.items || 'No items specified'}</pre>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {grn.notes && (
        <div className="mb-10 bg-yellow-50/50 p-4 rounded border border-yellow-100">
          <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Condition / Notes</h3>
          <p className="text-sm text-gray-800">{grn.notes}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="mt-20 pt-10 border-t border-gray-200 grid grid-cols-2 gap-16">
        <div className="text-center">
          <div className="border-b border-gray-400 mb-2 h-12"></div>
          <p className="font-bold text-gray-800 text-sm uppercase">Received By (Company)</p>
          <p className="text-xs text-gray-500 mt-1">{grn.receivedBy || 'Staff'}</p>
        </div>
        <div className="text-center">
          <div className="border-b border-gray-400 mb-2 h-12"></div>
          <p className="font-bold text-gray-800 text-sm uppercase">Customer Signature</p>
          <p className="text-xs text-gray-500 mt-1">Acknowledging submission</p>
        </div>
      </div>
    </div>
  );
};
