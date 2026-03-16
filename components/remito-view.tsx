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
}

export const RemitoView = forwardRef<HTMLDivElement, { order: Order }>(
  function RemitoView({ order }, ref) {
    const remitoNumber = order.remitoNumber ? String(order.remitoNumber).padStart(6, "0") : order.id.slice(0, 8).toUpperCase();

    return (
      <div
        ref={ref}
        className="mx-auto max-w-[210mm] bg-white p-8 text-black"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Kiway</h1>
            <p className="text-sm text-gray-600">* Limpieza Profesional *</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold">REMITO INTERNO</h2>
            <p className="text-sm font-mono">N: {remitoNumber}</p>
            <p className="text-sm">{formatDateTime(order.createdAt)}</p>
          </div>
        </div>

        {/* Details */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Empresa</p>
            <p className="text-sm font-semibold">{order.companyName}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Solicitado por</p>
            <p className="text-sm font-semibold">{order.supervisorName}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-2 text-left text-xs font-bold uppercase">Producto</th>
              <th className="py-2 text-left text-xs font-bold uppercase">Marca</th>
              <th className="py-2 text-right text-xs font-bold uppercase">Precio Unit.</th>
              <th className="py-2 text-center text-xs font-bold uppercase">Cant.</th>
              <th className="py-2 text-right text-xs font-bold uppercase">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={item.id} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                <td className="py-2 text-sm">{item.nameSnapshot}</td>
                <td className="py-2 text-sm">{item.brandSnapshot}</td>
                <td className="py-2 text-sm text-right">
                  {formatCurrency(Number(item.priceSnapshot))}
                </td>
                <td className="py-2 text-sm text-center">{item.quantity}</td>
                <td className="py-2 text-sm font-semibold text-right">
                  {formatCurrency(Number(item.priceSnapshot) * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black">
              <td colSpan={4} className="py-3 text-right font-bold">
                TOTAL:
              </td>
              <td className="py-3 text-right text-lg font-bold">
                {formatCurrency(Number(order.total))}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Signatures */}
        <div className="mt-16 grid grid-cols-2 gap-8">
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-black mb-1" />
            <p className="text-xs text-gray-500">Firma Supervisor</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-black mb-1" />
            <p className="text-xs text-gray-500">Firma Administracion</p>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400">
            Documento generado automaticamente por Kiway - {formatDateTime(new Date())}
          </div>
      </div>
    );
  }
);
