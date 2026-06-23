"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getOrderInvoice } from "@/lib/api";
import type { Order, GstSettings } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";

/* ── helpers ── */
function fmt(n: number) { return n.toFixed(2); }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function amountInWords(amount: number): string {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const sub100 = (n: number): string => n < 20 ? ones[n] : tens[Math.floor(n/10)] + (n%10 ? " "+ones[n%10] : "");
  const sub1000 = (n: number): string => n < 100 ? sub100(n) : ones[Math.floor(n/100)]+" Hundred"+(n%100 ? " "+sub100(n%100) : "");
  const r = Math.floor(amount);
  const p = Math.round((amount - r) * 100);
  let out = "";
  const cr = Math.floor(r/10000000), lk = Math.floor((r%10000000)/100000);
  const th = Math.floor((r%100000)/1000), rem = r%1000;
  if (cr) out += sub1000(cr)+" Crore ";
  if (lk) out += sub1000(lk)+" Lakh ";
  if (th) out += sub1000(th)+" Thousand ";
  if (rem) out += sub1000(rem);
  out = (out.trim() || "Zero")+" Rupees";
  if (p) out += " and "+sub100(p)+" Paise";
  return out+" Only";
}

/* ── cell styles ── */
const H: React.CSSProperties = { padding:"6px 8px", border:"1px solid #999", backgroundColor:"#f2f2f2", fontSize:10, fontWeight:700, textAlign:"center" as const, textTransform:"uppercase" as const };
const D: React.CSSProperties = { padding:"6px 8px", border:"1px solid #bbb", fontSize:11, verticalAlign:"top" as const };

export default function InvoicePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [gst, setGst] = useState<GstSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth"); return; }
    getOrderInvoice(orderId)
      .then(({ order: o, gstSettings }) => { setOrder(o); setGst(gstSettings); })
      .catch((e) => setError(e.message || "Invoice not found"))
      .finally(() => setLoading(false));
  }, [orderId, user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Skeleton className="h-10 w-48 mb-6 rounded-xl" />
        <Skeleton className="h-[800px] max-w-4xl mx-auto rounded-2xl" />
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-semibold text-red-600 mb-3">{error || "Invoice not found"}</p>
          <Button variant="outline" className="rounded-full" onClick={() => router.back()}>← Go back</Button>
        </div>
      </div>
    );
  }

  const gd = order.gst_breakdown;
  const isIG = gd?.is_interstate ?? false;
  const shipping = order.shipping_charge ?? 0;
  const INV = order.invoice_number || order.orderId;
  const company = gst.business_name || "Cotton Cloud Company";

  const rows = order.items.map(item => {
    const rate = item.gst_rate ?? 12;
    const selling = +(item.price * (1 - item.discount_percent / 100)).toFixed(2);
    const lineGross = +(selling * item.qty).toFixed(2);
    const taxable = +(lineGross / (1 + rate / 100)).toFixed(2);
    const tax = +(lineGross - taxable).toFixed(2);
    const cgst = isIG ? 0 : +(tax / 2).toFixed(2);
    const sgst = isIG ? 0 : +(tax - cgst).toFixed(2);
    const igst = isIG ? tax : 0;
    return { item, rate, selling, lineGross, taxable, tax, cgst, sgst, igst };
  });

  type HsnRow = { hsn: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number; tax: number };
  const hsnMap: Record<string, HsnRow> = {};
  rows.forEach(r => {
    const k = r.item.hsn_code || "N/A";
    if (!hsnMap[k]) hsnMap[k] = { hsn:k, rate:r.rate, taxable:0, cgst:0, sgst:0, igst:0, tax:0 };
    hsnMap[k].taxable += r.taxable; hsnMap[k].cgst += r.cgst;
    hsnMap[k].sgst += r.sgst; hsnMap[k].igst += r.igst; hsnMap[k].tax += r.tax;
  });
  const hsnRows = Object.values(hsnMap).map(h => ({ ...h,
    taxable:+h.taxable.toFixed(2), cgst:+h.cgst.toFixed(2),
    sgst:+h.sgst.toFixed(2), igst:+h.igst.toFixed(2), tax:+h.tax.toFixed(2),
  }));

  const totTaxable = +rows.reduce((s,r) => s+r.taxable, 0).toFixed(2);
  const totCgst    = +rows.reduce((s,r) => s+r.cgst, 0).toFixed(2);
  const totSgst    = +rows.reduce((s,r) => s+r.sgst, 0).toFixed(2);
  const totIgst    = +rows.reduce((s,r) => s+r.igst, 0).toFixed(2);
  const totTax     = +rows.reduce((s,r) => s+r.tax, 0).toFixed(2);
  const itemsTotal = +rows.reduce((s,r) => s+r.lineGross, 0).toFixed(2);

  const BASE: React.CSSProperties = {
    fontFamily:"'Times New Roman',Times,serif",
    fontSize:12, color:"#000", background:"#fff",
    maxWidth:860, margin:"0 auto", border:"1px solid #888",
  };

  return (
    <>
      {/* toolbar */}
      <div className="print:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 font-mono">{INV}</span>
          <Button onClick={() => window.print()} className="rounded-full gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm px-5 h-9">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <div style={{ background:"#e5e5e5", minHeight:"100vh", padding:"28px 0" }} className="print:bg-white print:p-0">
        <div id="invoice" style={BASE}>

          {/* ══ HEADER ══ */}
          <div style={{ borderBottom:"2px solid #333", padding:"16px 24px 12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>

              {/* Company block */}
              <div style={{ flex:1, paddingRight:20 }}>
                <div style={{ fontSize:20, fontWeight:700, letterSpacing:0.3, marginBottom:4 }}>{company}</div>
                {gst.address && (
                  <div style={{ fontSize:11, lineHeight:1.7, color:"#222" }}>
                    {gst.address}
                  </div>
                )}
                <div style={{ fontSize:11, lineHeight:1.7, color:"#222" }}>
                  {gst.state && <span>{gst.state}{gst.state_code ? ` — ${gst.state_code}` : ""}</span>}
                </div>
                <div style={{ marginTop:4, fontSize:11, lineHeight:1.7 }}>
                  {gst.phone && <span>Ph: {gst.phone}&nbsp;&nbsp;</span>}
                  {gst.email && <span>Email: {gst.email}</span>}
                </div>
                <div style={{ marginTop:6, fontSize:11, lineHeight:1.8 }}>
                  {gst.gstin && <div><strong>GSTIN:</strong> <span style={{ fontFamily:"monospace", letterSpacing:0.5 }}>{gst.gstin}</span></div>}
                  {gst.pan   && <div><strong>PAN:</strong> <span style={{ fontFamily:"monospace" }}>{gst.pan}</span></div>}
                </div>
              </div>

              {/* Invoice title + details */}
              <div style={{ textAlign:"right", minWidth:220 }}>
                <div style={{ fontSize:18, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:2, borderBottom:"1px solid #333", paddingBottom:6, marginBottom:8 }}>
                  TAX INVOICE
                </div>
                <div style={{ fontSize:10, color:"#555", marginBottom:6 }}>ORIGINAL FOR BUYER</div>
                <table style={{ marginLeft:"auto", fontSize:11, borderCollapse:"collapse" }}>
                  <tbody>
                    {[
                      ["Invoice No.", INV],
                      ["Order ID",   order.orderId],
                      ["Date",       fmtDate(order.createdAt)],
                      ["Payment",    order.payment_method === "razorpay" ? "Online (Paid)" : "Cash on Delivery"],
                    ].map(([k,v]) => (
                      <tr key={k}>
                        <td style={{ paddingRight:12, paddingBottom:4, color:"#444", whiteSpace:"nowrap" as const }}>{k}</td>
                        <td style={{ paddingBottom:4, fontWeight:600, fontFamily: k==="Invoice No."||k==="Order ID" ? "monospace" : "inherit" }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ══ BILL TO / SHIP TO ══ */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:"1px solid #888" }}>
            {[
              { label:"Details of Receiver (Bill To)", isShip: false },
              { label:"Details of Consignee (Ship To)", isShip: true },
            ].map(({ label, isShip }) => (
              <div key={label} style={{ padding:"10px 16px", borderRight: isShip ? "none" : "1px solid #888" }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:0.8, color:"#333", marginBottom:5 }}>{label}</div>
                <div style={{ fontSize:12, fontWeight:700 }}>{order.address.fullName}</div>
                <div style={{ fontSize:11, lineHeight:1.75, marginTop:2, color:"#222" }}>
                  {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}
                  <br/>{order.address.city}, {order.address.state}
                  <br/>PIN — {order.address.pincode}
                  {!isShip && <><br/>Ph: {order.address.phone}</>}
                </div>
                {!isShip && order.buyer_gstin && (
                  <div style={{ marginTop:4, fontSize:11 }}>
                    <strong>GSTIN:</strong> <span style={{ fontFamily:"monospace" }}>{order.buyer_gstin}</span>
                  </div>
                )}
                {isShip && (
                  <div style={{ marginTop:6, fontSize:10, color:"#555" }}>
                    Place of Supply: <strong style={{ color:"#000" }}>{order.address.state}</strong>
                    &nbsp;·&nbsp;{isIG ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ══ ITEMS TABLE ══ */}
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={{...H, width:28}}>S.No.</th>
                <th style={{...H, textAlign:"left" as const, width:"25%"}}>Description of Goods</th>
                <th style={H}>HSN/<br/>SAC</th>
                <th style={H}>Qty</th>
                <th style={H}>MRP<br/>(₹)</th>
                <th style={H}>Disc<br/>%</th>
                <th style={H}>Rate<br/>(₹)</th>
                <th style={H}>Taxable<br/>Value (₹)</th>
                {isIG ? (
                  <>
                    <th style={H}>IGST<br/>%</th>
                    <th style={H}>IGST<br/>Amt (₹)</th>
                  </>
                ) : (
                  <>
                    <th style={H}>CGST<br/>%</th>
                    <th style={H}>CGST<br/>Amt (₹)</th>
                    <th style={H}>SGST<br/>%</th>
                    <th style={H}>SGST<br/>Amt (₹)</th>
                  </>
                )}
                <th style={{...H, textAlign:"right" as const, borderRight:"1px solid #999"}}>Total<br/>Amt (₹)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, rate, selling, lineGross, taxable, cgst, sgst, igst }, i) => (
                <tr key={i}>
                  <td style={{...D, textAlign:"center" as const}}>{i+1}</td>
                  <td style={{...D, textAlign:"left" as const}}>
                    <div style={{ fontWeight:600 }}>{item.name}</div>
                    {(item.color || item.size) && (
                      <div style={{ fontSize:10, color:"#555", marginTop:1 }}>
                        {[item.color, item.size].filter(Boolean).join(" / ")}
                      </div>
                    )}
                  </td>
                  <td style={{...D, textAlign:"center" as const, fontFamily:"monospace"}}>{item.hsn_code || "N/A"}</td>
                  <td style={{...D, textAlign:"center" as const}}>{item.qty} Nos</td>
                  <td style={{...D, textAlign:"right" as const}}>
                    {item.discount_percent > 0
                      ? <><s style={{ color:"#888" }}>{fmt(item.price)}</s></>
                      : fmt(item.price)}
                  </td>
                  <td style={{...D, textAlign:"center" as const}}>{item.discount_percent > 0 ? `${item.discount_percent}%` : "—"}</td>
                  <td style={{...D, textAlign:"right" as const}}>{fmt(selling)}</td>
                  <td style={{...D, textAlign:"right" as const}}>{fmt(taxable)}</td>
                  {isIG ? (
                    <>
                      <td style={{...D, textAlign:"center" as const}}>{rate}%</td>
                      <td style={{...D, textAlign:"right" as const}}>{fmt(igst)}</td>
                    </>
                  ) : (
                    <>
                      <td style={{...D, textAlign:"center" as const}}>{rate/2}%</td>
                      <td style={{...D, textAlign:"right" as const}}>{fmt(cgst)}</td>
                      <td style={{...D, textAlign:"center" as const}}>{rate/2}%</td>
                      <td style={{...D, textAlign:"right" as const}}>{fmt(sgst)}</td>
                    </>
                  )}
                  <td style={{...D, textAlign:"right" as const, fontWeight:600, borderRight:"1px solid #bbb"}}>{fmt(lineGross)}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ fontWeight:700, backgroundColor:"#f2f2f2" }}>
                <td colSpan={7} style={{...D, textAlign:"right" as const, fontWeight:700}}>Total</td>
                <td style={{...D, textAlign:"right" as const}}>{fmt(totTaxable)}</td>
                {isIG ? (
                  <>
                    <td style={D}></td>
                    <td style={{...D, textAlign:"right" as const}}>{fmt(totIgst)}</td>
                  </>
                ) : (
                  <>
                    <td style={D}></td>
                    <td style={{...D, textAlign:"right" as const}}>{fmt(totCgst)}</td>
                    <td style={D}></td>
                    <td style={{...D, textAlign:"right" as const}}>{fmt(totSgst)}</td>
                  </>
                )}
                <td style={{...D, textAlign:"right" as const, fontWeight:700, borderRight:"1px solid #bbb"}}>{fmt(itemsTotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* ══ HSN SUMMARY + TOTALS ══ */}
          <div style={{ display:"grid", gridTemplateColumns:"55% 45%", borderTop:"1px solid #888" }}>

            {/* HSN summary */}
            <div style={{ padding:"12px 16px", borderRight:"1px solid #888" }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:0.8, marginBottom:6 }}>HSN / SAC-wise Tax Summary</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10 }}>
                <thead>
                  <tr>
                    {["HSN/SAC","Taxable Value (₹)",
                      ...(isIG ? ["IGST %","IGST Amt (₹)"] : ["CGST Amt (₹)","SGST Amt (₹)"]),
                      "Total Tax (₹)"
                    ].map(h => (
                      <th key={h} style={{ padding:"4px 6px", border:"1px solid #bbb", background:"#f2f2f2", fontWeight:700, textAlign: h==="HSN/SAC" ? "left" as const : "right" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hsnRows.map((h, i) => (
                    <tr key={i}>
                      <td style={{ padding:"4px 6px", border:"1px solid #ccc", fontFamily:"monospace" }}>{h.hsn}</td>
                      <td style={{ padding:"4px 6px", border:"1px solid #ccc", textAlign:"right" as const }}>{fmt(h.taxable)}</td>
                      {isIG ? (
                        <>
                          <td style={{ padding:"4px 6px", border:"1px solid #ccc", textAlign:"right" as const }}>{h.rate}%</td>
                          <td style={{ padding:"4px 6px", border:"1px solid #ccc", textAlign:"right" as const }}>{fmt(h.igst)}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding:"4px 6px", border:"1px solid #ccc", textAlign:"right" as const }}>{fmt(h.cgst)}</td>
                          <td style={{ padding:"4px 6px", border:"1px solid #ccc", textAlign:"right" as const }}>{fmt(h.sgst)}</td>
                        </>
                      )}
                      <td style={{ padding:"4px 6px", border:"1px solid #ccc", textAlign:"right" as const, fontWeight:600 }}>{fmt(h.tax)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight:700, background:"#f2f2f2" }}>
                    <td style={{ padding:"4px 6px", border:"1px solid #bbb" }}>Total</td>
                    <td style={{ padding:"4px 6px", border:"1px solid #bbb", textAlign:"right" as const }}>{fmt(totTaxable)}</td>
                    {isIG ? (
                      <>
                        <td style={{ padding:"4px 6px", border:"1px solid #bbb" }}></td>
                        <td style={{ padding:"4px 6px", border:"1px solid #bbb", textAlign:"right" as const }}>{fmt(totIgst)}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding:"4px 6px", border:"1px solid #bbb", textAlign:"right" as const }}>{fmt(totCgst)}</td>
                        <td style={{ padding:"4px 6px", border:"1px solid #bbb", textAlign:"right" as const }}>{fmt(totSgst)}</td>
                      </>
                    )}
                    <td style={{ padding:"4px 6px", border:"1px solid #bbb", textAlign:"right" as const }}>{fmt(totTax)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Grand total summary */}
            <div style={{ padding:"12px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:0.8, marginBottom:6 }}>Invoice Summary</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <tbody>
                  {[
                    ["Total Taxable Value", `₹ ${fmt(totTaxable)}`],
                    ...(isIG
                      ? [[`IGST @ ${gd?.igst_rate ?? 0}%`, `₹ ${fmt(totIgst)}`]]
                      : [
                          [`CGST @ ${gd?.cgst_rate ?? 0}%`, `₹ ${fmt(totCgst)}`],
                          [`SGST @ ${gd?.sgst_rate ?? 0}%`, `₹ ${fmt(totSgst)}`],
                        ]
                    ),
                    ["Total Tax", `₹ ${fmt(totTax)}`],
                    ["Shipping Charges", shipping > 0 ? `₹ ${fmt(shipping)}` : "NIL"],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ padding:"4px 0", color:"#333", borderBottom:"1px dotted #ccc" }}>{k}</td>
                      <td style={{ padding:"4px 0", textAlign:"right" as const, borderBottom:"1px dotted #ccc", fontFamily:"monospace" }}>{v}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2}><div style={{ borderTop:"2px solid #000", marginTop:4 }}></div></td>
                  </tr>
                  <tr>
                    <td style={{ fontSize:14, fontWeight:700, paddingTop:4 }}>Grand Total</td>
                    <td style={{ fontSize:14, fontWeight:700, textAlign:"right" as const, fontFamily:"monospace", paddingTop:4 }}>₹ {fmt(order.total)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Amount in words */}
              <div style={{ marginTop:8, padding:"6px 8px", border:"1px solid #ccc", background:"#f9f9f9", fontSize:10 }}>
                <span style={{ fontWeight:600 }}>Amount in Words:&nbsp;</span>
                <span style={{ fontStyle:"italic" }}>{amountInWords(order.total)}</span>
              </div>

              {/* Payment note */}
              <div style={{ marginTop:8, fontSize:10, color:"#444", lineHeight:1.6 }}>
                <strong>Payment Mode:</strong> {order.payment_method === "razorpay" ? "Online Payment" : "Cash on Delivery"}<br/>
                <strong>Payment Status:</strong> {order.payment_status === "paid" ? "Paid" : "Pending"}
                {order.razorpay_payment_id && (
                  <><br/><strong>Transaction ID:</strong> <span style={{ fontFamily:"monospace" }}>{order.razorpay_payment_id}</span></>
                )}
              </div>
            </div>
          </div>

          {/* ══ TERMS + SIGNATURE ══ */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderTop:"2px solid #333" }}>
            <div style={{ padding:"12px 16px", borderRight:"1px solid #888" }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:0.8, marginBottom:5 }}>Terms &amp; Conditions</div>
              <ol style={{ margin:0, paddingLeft:14, fontSize:10, color:"#333", lineHeight:1.85 }}>
                <li>Goods once sold will not be taken back or exchanged.</li>
                <li>All disputes subject to {gst.state || "local"} jurisdiction only.</li>
                <li>We are not responsible for goods damaged in transit.</li>
                <li>This is a system-generated invoice and does not require signature.</li>
                <li>Prices shown are inclusive of GST as detailed in the tax table above.</li>
              </ol>
            </div>
            <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column" as const, justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:0.8, marginBottom:6 }}>
                  For {company}
                </div>
                <div style={{ height:52, borderBottom:"1px solid #999", marginBottom:4 }}></div>
                <div style={{ fontSize:10, color:"#555" }}>Authorised Signatory</div>
              </div>
              <div style={{ marginTop:10, fontSize:9, color:"#999", textAlign:"right" as const }}>
                <div>E. &amp; O.E. &nbsp;·&nbsp; {INV}</div>
                <div>Generated: {new Date().toLocaleDateString("en-IN")}</div>
              </div>
            </div>
          </div>

          {/* ══ FOOTER ══ */}
          <div style={{ borderTop:"1px solid #888", padding:"6px 24px", display:"flex", justifyContent:"space-between", fontSize:9, color:"#666", background:"#f5f5f5" }}>
            <span>This is a computer-generated document. No signature is required.</span>
            <span>{company} {gst.gstin ? `· GSTIN: ${gst.gstin}` : ""}</span>
          </div>

        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { margin: 0; background: white; }
          #invoice { border: none !important; max-width: 100% !important; }
        }
      `}</style>
    </>
  );
}
