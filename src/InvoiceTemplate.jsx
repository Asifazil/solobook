import React, { forwardRef } from 'react';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const InvoiceTemplate = forwardRef(({ transaction, business, paperSize = 'A4', title, partyBalance }, ref) => {
  if (!transaction || !business) return null;

  const isSale = transaction.type === 'Sales';
  const headerTitle = title || (isSale ? 'TAX INVOICE' : 'PURCHASE BILL');
  const currentBillTotal = transaction.totalAmount ?? 0;
  const balanceNum = partyBalance != null ? Number(partyBalance) : null;
  const openingBalance = balanceNum != null ? balanceNum - currentBillTotal : null;
  const showBalanceSection = isSale && balanceNum != null;

  // Paper size dimensions (width x height in mm)
  const paperSizes = {
    'A4': { width: '210mm', height: '297mm' },
    'A5': { width: '148mm', height: '210mm' },
    'Letter': { width: '216mm', height: '279mm' },
    'Legal': { width: '216mm', height: '356mm' }
  };
  
  const selectedSize = paperSizes[paperSize] || paperSizes['A4'];
  const discountAmount = transaction.discountAmount ?? 0;
  const advanceAmount = transaction.advance ?? 0;
  const balanceDue = Math.max(0, (transaction.totalAmount ?? 0) - advanceAmount);

  return (
    <div ref={ref} className="invoice-for-print" style={{
      padding: '40px', 
      backgroundColor: 'white', 
      color: 'black', 
      width: selectedSize.width, 
      minHeight: selectedSize.height, 
      margin: 'auto', 
      border: '1px solid #ddd',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      lineHeight: '1.4'
    }}>
      {/* Header: Logo left, Business info center/left, Doc title + QR right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
          {business.logo && (
            <img src={business.logo} alt="Logo" style={{ maxHeight: '64px', maxWidth: '140px', objectFit: 'contain' }} />
          )}
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#000', margin: '0 0 4px 0' }}>
              {business.name}
            </h1>
            <p style={{ margin: '4px 0', color: '#000' }}>{business.address}</p>
            <p style={{ margin: '4px 0', color: '#000' }}>Phone: {business.phone}</p>
            {business.gstNumber && <p style={{ margin: '4px 0', color: '#000' }}>GSTIN: {business.gstNumber}</p>}
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          {business.qrCode && (
            <img src={business.qrCode} alt="QR" style={{ width: '72px', height: '72px', objectFit: 'contain' }} />
          )}
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#000' }}>
              {headerTitle}
            </h2>
            <p style={{ margin: '4px 0', color: '#000' }}># {transaction.invoiceNumber}</p>
            <p style={{ margin: '4px 0', color: '#000' }}>Date: {formatDate(transaction.date)}</p>
          </div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #999', marginBottom: '32px' }} />

      {/* Bill To / From */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px 0', textTransform: 'uppercase', color: '#333' }}>
          {isSale ? 'Bill To:' : 'Vendor Details:'}
        </h3>
        <h4 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0', color: '#000' }}>{transaction.partyName}</h4>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
        <thead>
          <tr style={{ backgroundColor: '#eee' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', border: '1px solid #999', color: '#000' }}>#</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', border: '1px solid #999', color: '#000' }}>Item Description</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #999', color: '#000' }}>Qty</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #999', color: '#000' }}>Rate</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #999', color: '#000' }}>Disc %</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #999', color: '#000' }}>GST %</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #999', color: '#000' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transaction.items.map((item, index) => {
            const qty = Number(item.qty) || 0;
            const price = Number(item.price) || 0;
            const discPct = Number(item.discountPercent) || 0;
            const taxRate = Number(item.taxRate) || 0;
            const lineAfterDisc = qty * price * (1 - discPct / 100);
            const lineTotal = item.total != null ? Number(item.total) : lineAfterDisc * (1 + taxRate / 100);
            return (
              <tr key={index}>
                <td style={{ padding: '12px', border: '1px solid #999', color: '#000' }}>{index + 1}</td>
                <td style={{ padding: '12px', border: '1px solid #999', fontWeight: '500', color: '#000' }}>{item.name}</td>
                <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #999', color: '#000' }}>{qty}</td>
                <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #999', color: '#000' }}>₹{price.toFixed(2)}</td>
                <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #999', color: '#000' }}>{discPct ? `${discPct}%` : '-'}</td>
                <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #999', color: '#000' }}>{taxRate}%</td>
                <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #999', color: '#000' }}>₹{lineTotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '250px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#333' }}>Subtotal</span>
            <span style={{ color: '#000' }}>₹{transaction.subtotal?.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#333' }}>Discount{transaction.discountPercent ? ` (${transaction.discountPercent}%)` : ''}</span>
              <span style={{ color: '#000' }}>-₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#333' }}>Tax Amount</span>
            <span style={{ color: '#000' }}>₹{transaction.taxAmount?.toFixed(2)}</span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #999', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#000' }}>Total</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
              ₹{transaction.totalAmount?.toFixed(2)}
            </span>
          </div>
          {isSale && advanceAmount > 0 && (
            <>
              <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#059669', fontWeight: '600' }}>Advance Received</span>
                <span style={{ color: '#059669', fontWeight: '600' }}>-₹{advanceAmount.toFixed(2)}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #999', margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626' }}>Balance Due</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626' }}>₹{balanceDue.toFixed(2)}</span>
              </div>
            </>
          )}
          {showBalanceSection && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid #999', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#333' }}>Opening balance</span>
                <span style={{ color: '#000' }}>₹{(openingBalance ?? 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#333' }}>Current bill</span>
                <span style={{ color: '#000' }}>₹{currentBillTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #999' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#000' }}>Total balance (pending)</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#000' }}>₹{(balanceNum ?? 0).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: '64px' }}>
        <div style={{ display: 'flex', gap: '32px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#333', fontWeight: 'bold' }}>Terms & Conditions:</p>
            <p style={{ margin: '0', fontSize: '12px', color: '#333' }}>
              1. Goods once sold will not be taken back.<br />
              2. Interest @ 18% will be charged if payment is not made within 7 days.
            </p>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ height: '40px' }}></div>
            <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold', color: '#000' }}>For {business.name}</p>
            <p style={{ margin: '0', fontSize: '12px', color: '#333' }}>Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default InvoiceTemplate;
