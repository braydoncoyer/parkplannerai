import { useState, useCallback } from 'react';
import {
  Share2,
  Link2,
  Check,
  Copy,
  Twitter,
  Facebook,
  MessageCircle,
  Mail,
  QrCode,
  X,
  Sparkles,
  Calendar,
  MapPin,
  Clock
} from 'lucide-react';
import './SharePlan.css';

interface SharePlanProps {
  planId: string;
  parkName: string;
  dates: string[];
  totalRides: number;
  totalWaitTimeSaved: number;
  onClose?: () => void;
}

type ShareMethod = 'copy' | 'twitter' | 'facebook' | 'whatsapp' | 'email' | 'qr';

export default function SharePlan({
  planId,
  parkName,
  dates,
  totalRides,
  totalWaitTimeSaved,
  onClose
}: SharePlanProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Generate the shareable URL
  const shareUrl = `${window.location.origin}/plan/shared/${planId}`;

  // Share text for social platforms
  const shareText = `Check out my ${parkName} itinerary! ${totalRides} rides planned with ${totalWaitTimeSaved} minutes saved. Built with ParkPulse.`;

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [shareUrl]);

  const handleShare = useCallback((method: ShareMethod) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    switch (method) {
      case 'copy':
        copyToClipboard();
        break;
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
          '_blank',
          'width=600,height=400'
        );
        break;
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          '_blank',
          'width=600,height=400'
        );
        break;
      case 'whatsapp':
        window.open(
          `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
          '_blank'
        );
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(`My ${parkName} Plan`)}&body=${encodedText}%0A%0A${encodedUrl}`;
        break;
      case 'qr':
        setShowQR(true);
        break;
    }
  }, [shareUrl, shareText, copyToClipboard, parkName]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="share-plan-overlay">
      <div className="share-plan-modal">
        {/* Close button */}
        {onClose && (
          <button className="share-close-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        )}

        {/* Header with decorative elements */}
        <div className="share-header">
          <div className="share-header-decoration" />
          <div className="share-icon-container">
            <Share2 size={24} />
          </div>
          <h2 className="share-title">Share Your Adventure</h2>
          <p className="share-subtitle">
            Send this magical itinerary to friends and family
          </p>
        </div>

        {/* Plan preview card */}
        <div className="share-plan-preview">
          <div className="preview-badge">
            <Sparkles size={12} />
            <span>Optimized Plan</span>
          </div>

          <h3 className="preview-park-name">{parkName}</h3>

          <div className="preview-stats">
            <div className="preview-stat">
              <Calendar size={14} />
              <span>
                {dates.length === 1
                  ? formatDate(dates[0])
                  : `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}`}
              </span>
            </div>
            <div className="preview-stat">
              <MapPin size={14} />
              <span>{totalRides} rides</span>
            </div>
            <div className="preview-stat highlight">
              <Clock size={14} />
              <span>{totalWaitTimeSaved}min saved</span>
            </div>
          </div>
        </div>

        {/* Copy link section */}
        <div className="share-link-section">
          <label className="share-link-label">Shareable Link</label>
          <div className="share-link-input-group">
            <div className="share-link-input">
              <Link2 size={16} />
              <input
                type="text"
                value={shareUrl}
                readOnly
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
            <button
              className={`share-copy-btn ${copied ? 'copied' : ''}`}
              onClick={copyToClipboard}
              type="button"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Social share buttons */}
        <div className="share-social-section">
          <label className="share-social-label">Share via</label>
          <div className="share-social-grid">
            <button
              className="share-social-btn twitter"
              onClick={() => handleShare('twitter')}
              type="button"
            >
              <Twitter size={20} />
              <span>Twitter</span>
            </button>
            <button
              className="share-social-btn facebook"
              onClick={() => handleShare('facebook')}
              type="button"
            >
              <Facebook size={20} />
              <span>Facebook</span>
            </button>
            <button
              className="share-social-btn whatsapp"
              onClick={() => handleShare('whatsapp')}
              type="button"
            >
              <MessageCircle size={20} />
              <span>WhatsApp</span>
            </button>
            <button
              className="share-social-btn email"
              onClick={() => handleShare('email')}
              type="button"
            >
              <Mail size={20} />
              <span>Email</span>
            </button>
          </div>
        </div>

        {/* QR Code option */}
        <button
          className="share-qr-btn"
          onClick={() => setShowQR(!showQR)}
          type="button"
        >
          <QrCode size={18} />
          <span>{showQR ? 'Hide QR Code' : 'Show QR Code'}</span>
        </button>

        {showQR && (
          <div className="share-qr-container">
            <div className="share-qr-placeholder">
              {/* QR code would be generated here using a library like qrcode.react */}
              <QrCode size={120} strokeWidth={1} />
              <p>Scan to view plan</p>
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="share-footer-note">
          Anyone with this link can view your itinerary (read-only)
        </p>
      </div>
    </div>
  );
}
