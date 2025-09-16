"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
  convertToPixelCrop,
} from "react-image-crop";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MediaItem } from "@/types";
import { Crop as CropIcon, RotateCcw, Download, Loader2 } from "lucide-react";
import "react-image-crop/dist/ReactCrop.css";

interface ImageCropperModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mediaItem: MediaItem | null;
  onCropComplete?: (croppedImageFile: File, originalMedia: MediaItem) => void;
  onError?: (error: string) => void;
}

// Common aspect ratios for different use cases
const ASPECT_RATIOS = [
  { label: "Free", value: null },
  { label: "Square (1:1)", value: 1 },
  { label: "Portrait (3:4)", value: 3 / 4 },
  { label: "Landscape (4:3)", value: 4 / 3 },
  { label: "Widescreen (16:9)", value: 16 / 9 },
  { label: "Banner (5:1)", value: 5 / 1 },
  { label: "Social Media Post (1.91:1)", value: 1.91 / 1 },
  { label: "Story (9:16)", value: 9 / 16 },
];

// Quality presets for different use cases
const QUALITY_PRESETS = [
  { label: "High Quality (90%)", value: 0.9 },
  { label: "Medium Quality (70%)", value: 0.7 },
  { label: "Low Quality (50%)", value: 0.5 },
  { label: "Web Optimized (60%)", value: 0.6 },
];

export default function ImageCropperModal({
  isOpen,
  onOpenChange,
  mediaItem,
  onCropComplete,
  onError,
}: ImageCropperModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [quality, setQuality] = useState<number>(0.9);
  const [outputWidth, setOutputWidth] = useState<number>(800);
  const [outputHeight, setOutputHeight] = useState<number>(600);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [originalImageDimensions, setOriginalImageDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const [displayImageDimensions, setDisplayImageDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  // Reset state when modal opens/closes or media changes
  useEffect(() => {
    if (isOpen && mediaItem) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      setImageLoaded(false);
      setIsProcessing(false);
      setAspectRatio(null);
      setQuality(0.9);
      setOutputWidth(mediaItem.width || 800);
      setOutputHeight(mediaItem.height || 600);
      setMaintainAspect(true);
      setOriginalImageDimensions({ width: 0, height: 0 });
      setDisplayImageDimensions({ width: 0, height: 0 });
    }
  }, [isOpen, mediaItem]);

  // Handle image load and set initial crop
  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height, naturalWidth, naturalHeight } = e.currentTarget;

      // Store both original and displayed dimensions for accurate calculations
      setOriginalImageDimensions({
        width: naturalWidth,
        height: naturalHeight,
      });
      setDisplayImageDimensions({ width, height });

      console.log("Image loaded:", {
        displayed: { width, height },
        original: { width: naturalWidth, height: naturalHeight },
      });

      // Set initial crop to center of image
      const initialCrop = aspectRatio
        ? centerCrop(
            makeAspectCrop(
              {
                unit: "%",
                width: 80,
              },
              aspectRatio,
              width,
              height
            ),
            width,
            height
          )
        : {
            unit: "%" as const,
            x: 10,
            y: 10,
            width: 80,
            height: 80,
          };

      setCrop(initialCrop);
      setImageLoaded(true);
    },
    [aspectRatio]
  );

  // Handle aspect ratio change
  const handleAspectRatioChange = useCallback((value: string) => {
    const ratio = value === "null" ? null : parseFloat(value);
    setAspectRatio(ratio);

    if (imgRef.current) {
      const { width, height } = imgRef.current;
      if (ratio) {
        const newCrop = centerCrop(
          makeAspectCrop(
            {
              unit: "%",
              width: 80,
            },
            ratio,
            width,
            height
          ),
          width,
          height
        );
        setCrop(newCrop);
      } else {
        // Free aspect ratio - set a default crop
        setCrop({
          unit: "%",
          x: 10,
          y: 10,
          width: 80,
          height: 80,
        });
      }
    }
  }, []);

  // Handle output dimensions change
  const handleOutputDimensionChange = useCallback(
    (dimension: "width" | "height", value: number) => {
      if (dimension === "width") {
        setOutputWidth(value);
        if (maintainAspect && aspectRatio) {
          setOutputHeight(Math.round(value / aspectRatio));
        }
      } else {
        setOutputHeight(value);
        if (maintainAspect && aspectRatio) {
          setOutputWidth(Math.round(value * aspectRatio));
        }
      }
    },
    [maintainAspect, aspectRatio]
  );

  // Create imgix cropped URL using dashboard approach (pixel-based rect parameter)
  const getCroppedImgixFile = useCallback(
    async (crop: PixelCrop, fileName: string): Promise<File> => {
      if (!mediaItem) {
        throw new Error("Media item not available");
      }

      console.log("=== CROP CALCULATION DEBUG ===");
      console.log(
        "Crop from ReactCrop (pixel coords relative to displayed image):",
        crop
      );
      console.log("Displayed image dimensions:", displayImageDimensions);
      console.log("Original media dimensions:", {
        width: mediaItem.width,
        height: mediaItem.height,
      });

      // Use the actual original image dimensions from mediaItem
      const sourceWidth = mediaItem.width || originalImageDimensions.width;
      const sourceHeight = mediaItem.height || originalImageDimensions.height;

      if (!sourceWidth || !sourceHeight) {
        throw new Error("Cannot determine source image dimensions");
      }

      // Calculate scale factors between displayed image and source image
      const scaleX = sourceWidth / displayImageDimensions.width;
      const scaleY = sourceHeight / displayImageDimensions.height;

      console.log("Scale factors (source/display):", { scaleX, scaleY });

      // Convert crop coordinates from displayed image space to source image space
      // Following dashboard approach: use pixel coordinates directly with rect parameter
      const rectX = Math.round(crop.x * scaleX);
      const rectY = Math.round(crop.y * scaleY);
      const rectWidth = Math.round(crop.width * scaleX);
      const rectHeight = Math.round(crop.height * scaleY);

      // Ensure coordinates are within bounds
      const clampedX = Math.max(0, Math.min(rectX, sourceWidth - 1));
      const clampedY = Math.max(0, Math.min(rectY, sourceHeight - 1));
      const clampedWidth = Math.max(
        1,
        Math.min(rectWidth, sourceWidth - clampedX)
      );
      const clampedHeight = Math.max(
        1,
        Math.min(rectHeight, sourceHeight - clampedY)
      );

      // Create rect parameter like dashboard: "x,y,width,height"
      const rectParam = `${clampedX},${clampedY},${clampedWidth},${clampedHeight}`;

      console.log("Final rect parameter:", rectParam);

      // Build imgix URL using dashboard approach with rect parameter
      const imgixParams = new URLSearchParams({
        // Use rect parameter for pixel-based cropping (dashboard approach)
        rect: rectParam,
        // Output dimensions
        w: outputWidth.toString(),
        h: outputHeight.toString(),
        // Quality and format optimization
        auto: "format,compress",
        q: Math.round(quality * 100).toString(),
      });

      const croppedImageUrl = `${
        mediaItem.imgix_url
      }?${imgixParams.toString()}`;
      console.log("Generated imgix URL:", croppedImageUrl);
      console.log("=== END CROP CALCULATION DEBUG ===");

      try {
        // Fetch the cropped image from imgix
        const response = await fetch(croppedImageUrl);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch cropped image: ${response.status} ${response.statusText}`
          );
        }

        const blob = await response.blob();

        // Create file with appropriate name
        const croppedFileName =
          fileName.replace(/\.[^/.]+$/, "") + "_cropped.jpg";
        const file = new File([blob], croppedFileName, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        console.log("Cropped file created:", {
          name: file.name,
          size: file.size,
          type: file.type,
        });

        return file;
      } catch (error) {
        console.error("Error fetching cropped image from imgix:", error);
        throw new Error(
          `Failed to create cropped image: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },
    [
      mediaItem,
      originalImageDimensions,
      displayImageDimensions,
      outputWidth,
      outputHeight,
      quality,
    ]
  );

  // Handle crop and save
  const handleCropSave = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !mediaItem) {
      onError?.("No crop area selected");
      return;
    }

    setIsProcessing(true);

    try {
      const croppedImageFile = await getCroppedImgixFile(
        completedCrop,
        mediaItem.original_name
      );

      onCropComplete?.(croppedImageFile, mediaItem);
      onOpenChange(false);
    } catch (error) {
      console.error("Error cropping image:", error);
      onError?.(
        error instanceof Error ? error.message : "Failed to crop image"
      );
    } finally {
      setIsProcessing(false);
    }
  }, [
    completedCrop,
    mediaItem,
    getCroppedImgixFile,
    onCropComplete,
    onError,
    onOpenChange,
  ]);

  // Handle crop reset
  const handleReset = useCallback(() => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    setAspectRatio(null);
  }, []);

  // Handle download preview
  const handleDownloadPreview = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !mediaItem) return;

    try {
      const croppedImageFile = await getCroppedImgixFile(
        completedCrop,
        mediaItem.original_name
      );

      // Create download link
      const url = URL.createObjectURL(croppedImageFile);
      const link = document.createElement("a");
      link.href = url;
      link.download = croppedImageFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading preview:", error);
      onError?.(
        error instanceof Error ? error.message : "Failed to download preview"
      );
    }
  }, [completedCrop, mediaItem, getCroppedImgixFile, onError]);

  if (!mediaItem || !mediaItem.type.startsWith("image/")) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <CropIcon className="h-5 w-5 text-blue-600" />
            <span>Crop Image</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Image Cropper - Left Side */}
          <div className="lg:col-span-3 flex flex-col">
            <div className="flex-1 bg-gray-50 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
              {mediaItem ? (
                <div className="w-full h-full flex items-center justify-center relative">
                  {/* Loading overlay */}
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      <span className="ml-2 text-gray-600">
                        Loading image...
                      </span>
                    </div>
                  )}

                  {/* Image with crop tool */}
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => {
                      if (imgRef.current) {
                        const pixelCrop = convertToPixelCrop(
                          c,
                          imgRef.current.width,
                          imgRef.current.height
                        );
                        console.log("Crop completed:", {
                          percentCrop: c,
                          pixelCrop,
                        });
                        setCompletedCrop(pixelCrop);
                      }
                    }}
                    aspect={aspectRatio || undefined}
                    minWidth={10}
                    minHeight={10}
                    keepSelection
                    ruleOfThirds
                    className={`max-w-full max-h-full ${
                      !imageLoaded ? "opacity-0" : "opacity-100"
                    } transition-opacity duration-300`}
                  >
                    <img
                      ref={imgRef}
                      alt={mediaItem.alt_text || mediaItem.original_name}
                      src={`${mediaItem.imgix_url}?w=1000&auto=format,compress`}
                      onLoad={onImageLoad}
                      onError={(e) => {
                        console.error("Image failed to load:", e);
                        console.log(
                          "Image URL:",
                          `${mediaItem.imgix_url}?w=1000&auto=format,compress`
                        );
                        console.log("MediaItem:", mediaItem);
                        setImageLoaded(false);
                      }}
                      className="max-w-full max-h-[500px] object-contain"
                      style={{
                        display: "block",
                        maxWidth: "100%",
                        maxHeight: "500px",
                        width: "auto",
                        height: "auto",
                      }}
                    />
                  </ReactCrop>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <span className="text-gray-600">No image selected</span>
                </div>
              )}
            </div>
          </div>

          {/* Controls - Right Side */}
          <div className="space-y-6">
            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Aspect Ratio</Label>
              <Select
                value={aspectRatio?.toString() || "null"}
                onValueChange={handleAspectRatioChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ratio) => (
                    <SelectItem
                      key={ratio.label}
                      value={ratio.value?.toString() || "null"}
                    >
                      {ratio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Output Dimensions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Output Size (pixels)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="width" className="text-xs text-gray-600">
                    Width
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    value={outputWidth}
                    onChange={(e) =>
                      handleOutputDimensionChange(
                        "width",
                        parseInt(e.target.value) || 800
                      )
                    }
                    min="50"
                    max="4000"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="text-xs text-gray-600">
                    Height
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    value={outputHeight}
                    onChange={(e) =>
                      handleOutputDimensionChange(
                        "height",
                        parseInt(e.target.value) || 600
                      )
                    }
                    min="50"
                    max="4000"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Quality */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quality</Label>
              <Select
                value={quality.toString()}
                onValueChange={(value) => setQuality(parseFloat(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALITY_PRESETS.map((preset) => (
                    <SelectItem
                      key={preset.label}
                      value={preset.value.toString()}
                    >
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full flex items-center space-x-2"
                disabled={isProcessing}
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset Crop</span>
              </Button>

              <Button
                onClick={handleDownloadPreview}
                variant="outline"
                className="w-full flex items-center space-x-2"
                disabled={!completedCrop || isProcessing}
              >
                <Download className="h-4 w-4" />
                <span>Preview Download</span>
              </Button>
            </div>

            {/* Debug Info */}
            <div className="p-3 bg-blue-50 rounded-lg text-xs">
              <div className="space-y-1">
                <p className="text-blue-800">
                  <strong>Original:</strong> {originalImageDimensions.width}×
                  {originalImageDimensions.height}px
                </p>
                <p className="text-blue-800">
                  <strong>Output:</strong> {outputWidth}×{outputHeight}px
                </p>
                {displayImageDimensions.width > 0 && (
                  <p className="text-blue-800">
                    <strong>Display:</strong>{" "}
                    {Math.round(displayImageDimensions.width)}×
                    {Math.round(displayImageDimensions.height)}px
                  </p>
                )}
                {completedCrop &&
                  displayImageDimensions.width > 0 &&
                  displayImageDimensions.height > 0 && (
                    <>
                      <p className="text-blue-800">
                        <strong>Crop Area:</strong>{" "}
                        {Math.round(completedCrop.width)}×
                        {Math.round(completedCrop.height)}px
                      </p>
                      <p className="text-blue-800">
                        <strong>Crop Position:</strong> (
                        {Math.round(completedCrop.x)},{" "}
                        {Math.round(completedCrop.y)})
                      </p>
                      <p className="text-blue-800">
                        <strong>Scale Factors:</strong> x
                        {(
                          originalImageDimensions.width /
                          displayImageDimensions.width
                        ).toFixed(2)}
                        , y
                        {(
                          originalImageDimensions.height /
                          displayImageDimensions.height
                        ).toFixed(2)}
                      </p>
                      <p className="text-blue-800">
                        <strong>Rect Param:</strong>{" "}
                        {(() => {
                          const sourceWidth =
                            mediaItem?.width || originalImageDimensions.width;
                          const sourceHeight =
                            mediaItem?.height || originalImageDimensions.height;
                          const scaleX =
                            sourceWidth / displayImageDimensions.width;
                          const scaleY =
                            sourceHeight / displayImageDimensions.height;
                          const rectX = Math.round(completedCrop.x * scaleX);
                          const rectY = Math.round(completedCrop.y * scaleY);
                          const rectWidth = Math.round(
                            completedCrop.width * scaleX
                          );
                          const rectHeight = Math.round(
                            completedCrop.height * scaleY
                          );
                          return `${rectX},${rectY},${rectWidth},${rectHeight}`;
                        })()}
                      </p>
                    </>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Hidden Canvas for Processing */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <DialogFooter className="flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCropSave}
            disabled={!completedCrop || isProcessing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CropIcon className="h-4 w-4 mr-2" />
                Save Cropped Image
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
