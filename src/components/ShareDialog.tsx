import { useState, useRef, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Camera, Share2, Copy, Check, X as XIcon, MessageCircle, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import ShareCard from './ShareCard';
import { WhoisData, PricingData } from './DomainResultCard';

interface ShareDialogProps {
  data: WhoisData;
  pricing?: PricingData | null;
}

const ShareDialog = ({ data, pricing }: ShareDialogProps) => {
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return null;
    
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: isDarkMode ? '#171717' : '#ffffff',
        useCORS: true,
        logging: false,
      });
      const url = canvas.toDataURL('image/png');
      setImageUrl(url);
      return url;
    } catch (error) {
      console.error('Screenshot error:', error);
      toast({
        description: language === 'zh' ? '截图生成失败' : 'Failed to generate screenshot',
        variant: 'destructive',
      });
      return null;
    } finally {
      setGenerating(false);
    }
  }, [toast, language, isDarkMode]);

  const handleScreenshot = async () => {
    setImageUrl(null); // Reset to regenerate with current theme
    setScreenshotOpen(true);
    // Small delay to ensure dialog is rendered
    setTimeout(async () => {
      await generateImage();
    }, 100);
  };

  const handleShare = async () => {
    setImageUrl(null); // Reset to regenerate with current theme
    setShareOpen(true);
    setTimeout(async () => {
      await generateImage();
    }, 100);
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${data.domain}-whois.png`;
    link.click();
    toast({
      description: language === 'zh' ? '图片已保存' : 'Image saved',
    });
  };

  const copyShareUrl = async () => {
    const url = `${window.location.origin}/${data.domain.toLowerCase()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      toast({ description: t('misc.copySuccess') });
    } catch {
      toast({ description: t('misc.copyFailed'), variant: 'destructive' });
    }
  };

  const shareToSocial = (platform: string) => {
    const url = `${window.location.origin}/${data.domain.toLowerCase()}`;
    const text = language === 'zh' 
      ? `查看 ${data.domain} 的域名信息`
      : `Check domain info for ${data.domain}`;
    
    let shareUrl = '';
    switch (platform) {
      case 'x':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'reddit':
        shareUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  const shareUrl = `${window.location.origin}/${data.domain.toLowerCase()}`;

  return (
    <>
      {/* Screenshot & Share Buttons */}
      <Button 
        variant="outline" 
        size="sm" 
        className="h-7 gap-1.5 text-xs"
        onClick={handleScreenshot}
      >
        <Camera className="h-3 w-3" />
        {language === 'zh' ? '截图' : 'Screenshot'}
      </Button>
      
      <Button 
        variant="outline" 
        size="sm" 
        className="h-7 gap-1.5 text-xs"
        onClick={handleShare}
      >
        <Share2 className="h-3 w-3" />
        {language === 'zh' ? '分享' : 'Share'}
      </Button>

      {/* Hidden card for rendering */}
      <div className="fixed -left-[9999px] top-0 z-[-1]">
        <ShareCard ref={cardRef} data={data} pricing={pricing} isDark={isDarkMode} />
      </div>

      {/* Screenshot Dialog */}
      <Dialog open={screenshotOpen} onOpenChange={setScreenshotOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {language === 'zh' ? '截图' : 'Screenshot'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4">
            {generating ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : imageUrl ? (
              <>
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <img src={imageUrl} alt="Screenshot" className="max-w-full h-auto" />
                </div>
                <Button onClick={downloadImage} className="w-full gap-2">
                  <Camera className="h-4 w-4" />
                  {language === 'zh' ? '保存图片' : 'Save Image'}
                </Button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              {language === 'zh' ? '分享' : 'Share'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {language === 'zh' ? '与他人分享结果' : 'Share results with others'}
            </p>

            {/* Social Media Icons */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => shareToSocial('x')}
              >
                <XIcon className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => shareToSocial('facebook')}
              >
                <span className="text-lg font-bold">f</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => shareToSocial('reddit')}
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => shareToSocial('whatsapp')}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => shareToSocial('telegram')}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>

            {/* Share URL */}
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-transparent text-sm outline-none truncate"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={copyShareUrl}
              >
                {copiedUrl ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Download Image Button */}
            {imageUrl && (
              <Button onClick={downloadImage} variant="outline" className="w-full gap-2">
                <Camera className="h-4 w-4" />
                {language === 'zh' ? '保存截图' : 'Save Screenshot'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShareDialog;
