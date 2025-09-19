"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share, Copy, ExternalLink, Check, Facebook, Twitter, Linkedin, Mail, MessageCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface PublicCampaignClientProps {
  campaignId: string;
}

export default function PublicCampaignClient({ campaignId }: PublicCampaignClientProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/public/campaigns/${campaignId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setIsCopied(true);
      // Reset the check icon after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const handleNativeShare = async () => {
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

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`,
      color: 'text-blue-600'
    },
    {
      name: 'Twitter',
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent('Check out this email campaign')}`,
      color: 'text-sky-500'
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`,
      color: 'text-blue-700'
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      url: `https://wa.me/?text=${encodeURIComponent(`Check out this email campaign: ${publicUrl}`)}`,
      color: 'text-green-600'
    },
    {
      name: 'Email',
      icon: Mail,
      url: `mailto:?subject=${encodeURIComponent('Email Campaign')}&body=${encodeURIComponent(`Check out this email campaign: ${publicUrl}`)}`,
      color: 'text-gray-600'
    }
  ];

  const handleSocialShare = (url: string) => {
    window.open(url, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        onClick={handleCopyLink}
        variant="outline"
        size="sm"
        className="flex items-center space-x-1"
      >
        {isCopied ? (
          <>
            <Check className="h-4 w-4 text-green-600" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            <span>Copy Link</span>
          </>
        )}
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isSharing}
            className="flex items-center space-x-1"
          >
            <Share className="h-4 w-4" />
            <span>{isSharing ? 'Sharing...' : 'Share'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {shareOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <DropdownMenuItem
                key={option.name}
                onClick={() => handleSocialShare(option.url)}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <IconComponent className={`h-4 w-4 ${option.color}`} />
                <span>Share on {option.name}</span>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleNativeShare}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <Share className="h-4 w-4 text-gray-600" />
            <span>More options...</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}