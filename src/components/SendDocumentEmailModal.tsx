import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/contexts/SettingsContext';
import { useDialog } from '@/components/ui/DialogProvider';
import { Mail, Send, Paperclip, CheckCircle2, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { generatePdfDataUri } from '@/lib/exportToPdf';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface SendDocumentEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'quotation' | 'invoice';
  documentNumber: string;
  customerName: string;
  customerEmail?: string;
  totalAmount?: string | number;
  validityDays?: string | number;
  elementIdToPdf?: string;
  onSuccess?: () => void;
}

export const SendDocumentEmailModal: React.FC<SendDocumentEmailModalProps> = ({
  isOpen,
  onClose,
  documentType,
  documentNumber,
  customerName,
  customerEmail = '',
  totalAmount = '0.00',
  validityDays = '30',
  elementIdToPdf,
  onSuccess
}) => {
  const { settings } = useSettings();
  const { toast } = useDialog();

  const [toEmail, setToEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);
  const [sending, setSending] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const docLabel = documentType === 'quotation' ? 'Quotation' : 'Tax Invoice';

  // Format templates on open
  useEffect(() => {
    if (isOpen) {
      setToEmail(customerEmail || '');
      setCcEmail('');
      setAttachPdf(true);

      const compName = settings?.company_name || settings?.smtp_from_name || 'Rex Industries (Pvt) Ltd';
      const formattedTotal = typeof totalAmount === 'number' 
        ? `Rs. ${totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
        : String(totalAmount);

      if (documentType === 'quotation') {
        let tplSubject = settings?.smtp_quote_subject || `Quotation #{number} - ${compName}`;
        tplSubject = tplSubject
          .replace(/{number}/g, documentNumber)
          .replace(/{customer_name}/g, customerName)
          .replace(/{company_name}/g, compName)
          .replace(/{total}/g, formattedTotal)
          .replace(/{validity}/g, String(validityDays));
        setSubject(tplSubject);

        let tplBody = settings?.smtp_quote_body || 
`Dear {customer_name},

Please find attached Quotation #{number} from {company_name}.

Validity: {validity} Days
Total Amount: {total}

If you have any questions or require revisions, please do not hesitate to contact us.

Best regards,
{company_name}
Tel: 0094-31-2233117 / 2233315
Email: ${settings?.smtp_from_email || 'info@rexgroup.lk'}`;

        tplBody = tplBody
          .replace(/{number}/g, documentNumber)
          .replace(/{customer_name}/g, customerName || 'Valued Customer')
          .replace(/{company_name}/g, compName)
          .replace(/{total}/g, formattedTotal)
          .replace(/{validity}/g, String(validityDays));
        setMessage(tplBody);
      } else {
        let tplSubject = settings?.smtp_invoice_subject || `Tax Invoice #{number} - ${compName}`;
        tplSubject = tplSubject
          .replace(/{number}/g, documentNumber)
          .replace(/{customer_name}/g, customerName)
          .replace(/{company_name}/g, compName)
          .replace(/{total}/g, formattedTotal);
        setSubject(tplSubject);

        let tplBody = settings?.smtp_invoice_body || 
`Dear {customer_name},

Please find attached Tax Invoice #{number} from {company_name}.

Total Due: {total}

Thank you for your valued business. Please arrange payment as per our agreed terms.

Best regards,
Finance & Accounts Department
{company_name}`;

        tplBody = tplBody
          .replace(/{number}/g, documentNumber)
          .replace(/{customer_name}/g, customerName || 'Valued Customer')
          .replace(/{company_name}/g, compName)
          .replace(/{total}/g, formattedTotal);
        setMessage(tplBody);
      }
    }
  }, [isOpen, documentType, documentNumber, customerName, customerEmail, totalAmount, validityDays, settings]);

  const handleSendEmail = async () => {
    if (!toEmail.trim()) {
      toast('Please enter a recipient email address', 'error');
      return;
    }
    if (!subject.trim()) {
      toast('Please enter an email subject', 'error');
      return;
    }

    setSending(true);

    try {
      const attachments: any[] = [];

      // Generate PDF attachment if selected and element exists
      if (attachPdf && elementIdToPdf) {
        const element = document.getElementById(elementIdToPdf);
        if (element) {
          setPdfGenerating(true);
          try {
            const pdfDataUri: string = await generatePdfDataUri(element, `${docLabel}-${documentNumber}.pdf`);
            if (pdfDataUri) {
              attachments.push({
                filename: `${docLabel}-${documentNumber}.pdf`,
                content: pdfDataUri,
                encoding: 'base64',
                contentType: 'application/pdf'
              });
            }
          } catch (pdfErr) {
            console.warn('Could not generate PDF attachment from element:', pdfErr);
          } finally {
            setPdfGenerating(false);
          }
        }
      }

      const res = await fetch(`${API_BASE}/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail.trim(),
          cc: ccEmail.trim() || undefined,
          subject: subject.trim(),
          text: message,
          attachments,
          docType: docLabel,
          docNumber: documentNumber
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast(`${docLabel} #${documentNumber} sent successfully to ${toEmail}!`, 'success');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast(data.error || 'Failed to send email. Please check your Outgoing SMTP Settings in Admin.', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Network error while attempting to send email', 'error');
    } finally {
      setSending(false);
    }
  };

  const senderDisplay = settings?.smtp_from_email 
    ? `${settings?.smtp_from_name || 'Rex Industries'} <${settings.smtp_from_email}>`
    : 'Not configured (will use server default)';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Email ${docLabel} #${documentNumber}`}
      size="lg"
      className="rounded-2xl"
    >
      <div className="p-6 space-y-4">
        {/* From address badge */}
        <div className="bg-surface2/50 border border-theme-subtle rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-secondary uppercase tracking-wider text-[11px]">From:</span>
            <span className="text-primary font-mono font-medium">{senderDisplay}</span>
          </div>
          {!settings?.smtp_from_email && (
            <span className="text-[10px] text-amber-500 font-medium">
              Tip: Configure your official sender email in Admin &gt; Settings
            </span>
          )}
        </div>

        {/* Recipient details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">
              Recipient Email (To) <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={toEmail}
              onChange={e => setToEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">
              CC Email (Optional)
            </label>
            <input
              type="email"
              value={ccEmail}
              onChange={e => setCcEmail(e.target.value)}
              placeholder="accounting@customer.com"
              className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Message body */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">
            Email Message
          </label>
          <textarea
            rows={7}
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary font-mono leading-relaxed focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"
          />
        </div>

        {/* Attach PDF Checkbox */}
        {elementIdToPdf && (
          <div className="flex items-center gap-2 pt-1 pb-1">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-primary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={e => setAttachPdf(e.target.checked)}
                className="w-4 h-4 rounded border-theme-subtle text-blue-600 focus:ring-blue-500"
              />
              <span className="flex items-center gap-1.5">
                <Paperclip size={14} className="text-blue-500" />
                Attach {docLabel} as PDF (<code className="text-[11px] text-muted">{docLabel}-{documentNumber}.pdf</code>)
              </span>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-theme-subtle">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={sending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSendEmail}
            disabled={sending || !toEmail.trim()}
            icon={Send}
            className="text-xs font-bold px-5 py-2 shadow-md shadow-blue-500/20"
          >
            {sending ? (pdfGenerating ? 'Generating PDF...' : 'Sending Email...') : `Send ${docLabel}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
