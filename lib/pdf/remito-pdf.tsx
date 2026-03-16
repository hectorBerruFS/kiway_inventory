import { createElement } from "react";

interface OrderItem {
  id: string;
  nameSnapshot: string;
  brandSnapshot: string;
  priceSnapshot: string;
  quantity: number;
}

interface OrderForPdf {
  id: string;
  companyName: string | null;
  supervisorName: string | null;
  total: string;
  createdAt: Date | string;
  remitoNumber?: number | null;
  items: OrderItem[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export async function renderRemitoPdf(order: OrderForPdf): Promise<Uint8Array> {
  const pkg = "@react-pdf/renderer";
  const reactPdf = (await import(pkg)) as any;

  const { Document, Page, Text, View, StyleSheet, renderToBuffer } = reactPdf;

  const styles = StyleSheet.create({
    page: {
      paddingTop: 28,
      paddingRight: 28,
      paddingBottom: 24,
      paddingLeft: 28,
      fontSize: 10,
      fontFamily: "Helvetica",
      color: "#111827",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottomWidth: 1.5,
      borderBottomColor: "#000",
      paddingBottom: 10,
      marginBottom: 12,
    },
    brandTitle: { fontSize: 18, fontWeight: 700 },
    brandSubtitle: { fontSize: 9, color: "#4B5563", marginTop: 2 },
    rightHeader: { alignItems: "flex-end", gap: 2 },
    docTitle: { fontSize: 12, fontWeight: 700 },
    meta: { fontSize: 9 },
    details: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    detailLabel: { fontSize: 8, color: "#6B7280", textTransform: "uppercase" },
    detailValue: { fontSize: 10, fontWeight: 600, marginTop: 2 },
    table: {
      borderWidth: 1,
      borderColor: "#111827",
      borderStyle: "solid",
      marginTop: 4,
    },
    row: { flexDirection: "row", alignItems: "center" },
    headerRow: {
      backgroundColor: "#F3F4F6",
      borderBottomWidth: 1,
      borderBottomColor: "#111827",
      fontWeight: 700,
      minHeight: 26,
    },
    cell: { paddingVertical: 6, paddingHorizontal: 6, fontSize: 9 },
    c1: { width: "36%" },
    c2: { width: "18%" },
    c3: { width: "16%", textAlign: "right" },
    c4: { width: "12%", textAlign: "center" },
    c5: { width: "18%", textAlign: "right" },
    bodyRow: { borderBottomWidth: 0.6, borderBottomColor: "#D1D5DB", minHeight: 24 },
    footerRow: {
      borderTopWidth: 1,
      borderTopColor: "#111827",
      minHeight: 28,
      alignItems: "center",
      fontWeight: 700,
    },
    signatures: {
      marginTop: 26,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 20,
    },
    signBox: { width: "45%", alignItems: "center" },
    signLine: { borderBottomWidth: 1, borderBottomColor: "#111827", width: "100%", marginBottom: 5 },
    signLabel: { fontSize: 8, color: "#4B5563" },
    pageFooter: {
      position: "absolute",
      bottom: 12,
      left: 28,
      right: 28,
      textAlign: "center",
      fontSize: 7,
      color: "#9CA3AF",
    },
  });

  const remitoNumber = order.remitoNumber
    ? String(order.remitoNumber).padStart(6, "0")
    : order.id.slice(0, 8).toUpperCase();

  const rows = order.items.map((item) => {
    const subtotal = Number(item.priceSnapshot) * item.quantity;

    return createElement(
      View,
      { style: [styles.row, styles.bodyRow], key: item.id, wrap: false },
      createElement(Text, { style: [styles.cell, styles.c1] }, item.nameSnapshot),
      createElement(Text, { style: [styles.cell, styles.c2] }, item.brandSnapshot),
      createElement(Text, { style: [styles.cell, styles.c3] }, formatCurrency(Number(item.priceSnapshot))),
      createElement(Text, { style: [styles.cell, styles.c4] }, String(item.quantity)),
      createElement(Text, { style: [styles.cell, styles.c5] }, formatCurrency(subtotal))
    );
  });

  const document = createElement(
    Document,
    {
      title: `Remito ${remitoNumber}`,
      author: "Kiway",
      subject: "Remito interno",
      language: "es-AR",
    },
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(
        View,
        { style: styles.header },
        createElement(
          View,
          null,
          createElement(Text, { style: styles.brandTitle }, "Kiway"),
          createElement(Text, { style: styles.brandSubtitle }, "Limpieza Profesional")
        ),
        createElement(
          View,
          { style: styles.rightHeader },
          createElement(Text, { style: styles.docTitle }, "REMITO INTERNO"),
          createElement(Text, { style: styles.meta }, `N° ${remitoNumber}`),
          createElement(Text, { style: styles.meta }, formatDate(order.createdAt))
        )
      ),
      createElement(
        View,
        { style: styles.details },
        createElement(
          View,
          null,
          createElement(Text, { style: styles.detailLabel }, "Empresa"),
          createElement(Text, { style: styles.detailValue }, order.companyName ?? "-")
        ),
        createElement(
          View,
          { style: { alignItems: "flex-end" } },
          createElement(Text, { style: styles.detailLabel }, "Solicitado por"),
          createElement(Text, { style: styles.detailValue }, order.supervisorName ?? "-")
        )
      ),
      createElement(
        View,
        { style: styles.table },
        createElement(
          View,
          { style: [styles.row, styles.headerRow] },
          createElement(Text, { style: [styles.cell, styles.c1] }, "Producto"),
          createElement(Text, { style: [styles.cell, styles.c2] }, "Marca"),
          createElement(Text, { style: [styles.cell, styles.c3] }, "Precio unit."),
          createElement(Text, { style: [styles.cell, styles.c4] }, "Cant."),
          createElement(Text, { style: [styles.cell, styles.c5] }, "Subtotal")
        ),
        ...rows,
        createElement(
          View,
          { style: [styles.row, styles.footerRow] },
          createElement(Text, { style: [styles.cell, styles.c1, { width: "82%", textAlign: "right" }] }, "TOTAL"),
          createElement(Text, { style: [styles.cell, styles.c5, { width: "18%" }] }, formatCurrency(Number(order.total)))
        )
      ),
      createElement(
        View,
        { style: styles.signatures },
        createElement(
          View,
          { style: styles.signBox },
          createElement(View, { style: styles.signLine }),
          createElement(Text, { style: styles.signLabel }, "Firma Supervisor")
        ),
        createElement(
          View,
          { style: styles.signBox },
          createElement(View, { style: styles.signLine }),
          createElement(Text, { style: styles.signLabel }, "Firma Administración")
        )
      ),
      createElement(
        Text,
        { style: styles.pageFooter, fixed: true },
        `Documento generado automáticamente por Kiway · ${formatDate(new Date())}`
      )
    )
  );

  const buffer = await renderToBuffer(document);
  return new Uint8Array(buffer);
}
