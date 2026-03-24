import { forwardRef } from "react";
import { formatCurrency, formatDateTime } from "@/lib/format";

interface OrderItem {
  id: string;
  nameSnapshot: string;
  brandSnapshot: string;
  priceSnapshot: string;
  quantity: number;
}

interface Order {
  id: string;
  companyName: string;
  supervisorName: string;
  status: string;
  total: string;
  createdAt: string;
  remitoNumber?: number | null;
  items: OrderItem[];
  budgetAssessment?: {
    monthlyBudget: string;
    month: string;
  };
}

export const RemitoView = forwardRef<HTMLDivElement, { order: Order }>(
  function RemitoView({ order }, ref) {
    const remitoNumber = order.remitoNumber ? String(order.remitoNumber).padStart(6, "0") : order.id.slice(0, 8).toUpperCase();

    return (
      <div
        ref={ref}
        className="mx-auto max-w-[210mm] bg-white text-black remito-container px-2"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 15mm; }
            .remito-container { width: 100%; padding: 0 !important; }
          }
          .remito-table thead { display: table-header-group; }
          .page-number:after { content: "Hoja " counter(page); }
        `}} />

        <table className="w-full remito-table border-collapse">
          <thead>
            <tr>
              <td>
                <div className="flex items-start justify-between border-b-2 border-black pb-2 mb-4">
                  <div>
                    <h1 className="text-xl font-bold">Kiway</h1>
                    <p className="text-xs text-gray-600">Limpieza Profesional</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-sm font-bold">REMITO INTERNO</h2>
                    <p className="text-xs font-mono font-bold">N° {remitoNumber}</p>
                    <div className="text-[10px] text-gray-500 mt-1 page-number" />
                  </div>
                </div>
              </td>
            </tr>
          </thead>
          
          <tbody>
            <tr>
              <td>
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-4">
                    <div className="grid grid-cols-1 gap-1">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-gray-500">Empresa</p>
                        <p className="text-sm font-bold">{order.companyName}</p>
                      </div>
                      <div className="mt-2">
                        <p className="text-[10px] font-bold uppercase text-gray-500">Solicitado por</p>
                        <p className="text-sm font-semibold">{order.supervisorName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase text-gray-500">Fecha Pedido</p>
                      <p className="text-sm font-semibold">{formatDateTime(order.createdAt)}</p>
                      
                      {order.budgetAssessment && (
                        <div className="mt-2 p-2 border border-black rounded bg-gray-50">
                          <p className="text-[9px] font-bold uppercase text-gray-600">Presupuesto Asignado ({order.budgetAssessment.month})</p>
                          <p className="text-sm font-bold">{formatCurrency(Number(order.budgetAssessment.monthlyBudget))}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black bg-gray-100">
                        <th className="py-2 px-1 text-left text-[10px] font-bold uppercase">Producto</th>
                        <th className="py-2 px-1 text-left text-[10px] font-bold uppercase">Marca</th>
                        <th className="py-2 px-1 text-right text-[10px] font-bold uppercase">P. Unit</th>
                        <th className="py-2 px-1 text-center text-[10px] font-bold uppercase">Cant.</th>
                        <th className="py-2 px-1 text-right text-[10px] font-bold uppercase">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={item.id} className="border-b border-gray-200">
                          <td className="py-1.5 px-1 text-sm">{item.nameSnapshot}</td>
                          <td className="py-1.5 px-1 text-sm">{item.brandSnapshot}</td>
                          <td className="py-1.5 px-1 text-sm text-right">
                            {formatCurrency(Number(item.priceSnapshot))}
                          </td>
                          <td className="py-1.5 px-1 text-sm text-center">{item.quantity}</td>
                          <td className="py-1.5 px-1 text-sm font-semibold text-right">
                            {formatCurrency(Number(item.priceSnapshot) * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-black">
                        <td colSpan={4} className="py-3 text-right font-bold text-sm">
                          TOTAL:
                        </td>
                        <td className="py-3 text-right text-base font-bold">
                          {formatCurrency(Number(order.total))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-12 mb-8 grid grid-cols-2 gap-12">
                  <div className="flex flex-col items-center">
                    <div className="w-48 border-b border-black mb-1" />
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Firma Supervisor</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-48 border-b border-black mb-1" />
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Firma Administración</p>
                  </div>
                </div>

                <div className="text-center text-[9px] text-gray-400 mt-4">
                  Documento generado automáticamente por Kiway - {formatDateTime(new Date())}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
);
