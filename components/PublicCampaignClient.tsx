"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Share, Copy, ExternalLink } from "lucide-react";

interface PublicCampaignClientProps {
  campaignId: string;
}

export default function PublicCampaignClient({ campaignId }: PublicCampaignClientProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/public/campaigns/${campaignId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Link copied!",
        description: "The campaign link has been copied to your clipboard.",
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast({
        title: "Copy failed",
        description: "Unable to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Email Campaign',
          text: 'Check out this email campaign',
          url: publicUrl,
        });
      } else {
        // Fallback to copy to clipboard
        await handleCopyLink();
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("Failed to share:", error);
        // Fallback to copy
        await handleCopyLink();
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        onClick={handleCopyLink}
        variant="outline"
        size="sm"
        className="flex items-center space-x-1"
      >
        <Copy className="h-4 w-4" />
        <span>Copy Link</span>
      </Button>
      
      <Button
        onClick={handleShare}
        variant="outline"
        size="sm"
        disabled={isSharing}
        className="flex items-center space-x-1"
      >
        <Share className="h-4 w-4" />
        <span>{isSharing ? 'Sharing...' : 'Share'}</span>
      </Button>
    </div>
  );
}