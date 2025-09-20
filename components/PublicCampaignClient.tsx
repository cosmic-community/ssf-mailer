"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share, Copy, ExternalLink, Check, Facebook, Linkedin, Mail, MessageCircle } from "lucide-react";
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

// X (formerly Twitter) icon component
function XIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <title></title>
        <path 
          d="M17.7508 2.96069H20.8175L14.1175 10.619L22 21.0382H15.8283L10.995 14.7182L5.46333 21.0382H2.395L9.56167 12.8465L2 2.96153H8.32833L12.6975 8.73819L17.7508 2.96069ZM16.675 19.2032H18.3742L7.405 4.69986H5.58167L16.675 19.2032Z" 
          stroke="none"
          fill="currentColor"
        />
      </g>
    </svg>
  );
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
      name: 'X',
      icon: XIcon,
      url: `https://x.com/intent/tweet?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent('Check out this email campaign')}`,
      color: 'text-gray-900'
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
    // Open in new tab instead of popup window
    window.open(url, '_blank', 'noopener,noreferrer');
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