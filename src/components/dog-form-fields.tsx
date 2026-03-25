import { useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import { Camera } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { type DogInput } from "@/hooks/use-dogs";
import { cn } from "@/lib/utils";

interface DogFormFieldsProps {
  form: UseFormReturn<DogInput>;
  photoPreview: string | null;
  onPhotoChange: (preview: string, base64: string) => void;
}

export function DogFormFields({ form, photoPreview, onPhotoChange }: DogFormFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "파일이 너무 큽니다 (5MB 이하)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      onPhotoChange(base64String, base64String);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {/* 사진 업로드 */}
      <div className="flex flex-col items-center justify-center gap-4">
        <div
          className={cn(
            "relative w-28 h-28 rounded-full flex items-center justify-center cursor-pointer transition-all overflow-hidden border-4 border-background shadow-lg",
            photoPreview ? "bg-card" : "bg-secondary hover:bg-secondary/80"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          {photoPreview ? (
            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-5xl">🐕</div>
          )}
          <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-8 h-8 text-white drop-shadow-md" />
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
        <p className="text-xs text-muted-foreground font-medium bg-secondary px-3 py-1 rounded-full">
          사진을 터치해서 {photoPreview ? "변경" : "업로드"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel className="font-semibold text-foreground/80">이름</FormLabel>
            <FormControl>
              <Input placeholder="초코" {...field} className="bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:ring-primary/20 focus-visible:border-primary h-12 rounded-xl text-lg" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="breed" render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel className="font-semibold text-foreground/80">견종</FormLabel>
            <FormControl>
              <Input placeholder="푸들" {...field} className="bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:ring-primary/20 focus-visible:border-primary h-12 rounded-xl text-lg" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="age" render={({ field }) => (
          <FormItem>
            <FormLabel className="font-semibold text-foreground/80">나이</FormLabel>
            <FormControl>
              <div className="relative">
                <Input type="number" placeholder="3" {...field} className="bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:ring-primary/20 focus-visible:border-primary h-12 rounded-xl text-lg pr-8" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">살</span>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="weight" render={({ field }) => (
          <FormItem>
            <FormLabel className="font-semibold text-foreground/80">몸무게 <span className="text-muted-foreground font-normal">(선택)</span></FormLabel>
            <FormControl>
              <div className="relative">
                <Input type="number" step="0.1" placeholder="4.5" {...field} className="bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:ring-primary/20 focus-visible:border-primary h-12 rounded-xl text-lg pr-10" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">kg</span>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="gender" render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel className="font-semibold text-foreground/80">성별</FormLabel>
            <FormControl>
              <div className="flex gap-3">
                <button type="button" onClick={() => field.onChange("male")}
                  className={cn("flex-1 h-12 rounded-xl font-bold transition-all border-2", field.value === "male" ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm" : "bg-card border-border/50 text-muted-foreground hover:bg-secondary")}>
                  수컷 ♂
                </button>
                <button type="button" onClick={() => field.onChange("female")}
                  className={cn("flex-1 h-12 rounded-xl font-bold transition-all border-2", field.value === "female" ? "bg-pink-50 border-pink-500 text-pink-700 shadow-sm" : "bg-card border-border/50 text-muted-foreground hover:bg-secondary")}>
                  암컷 ♀
                </button>
              </div>
            </FormControl>
          </FormItem>
        )} />

        <FormField control={form.control} name="neutered" render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel className="font-semibold text-foreground/80">중성화 여부</FormLabel>
            <FormControl>
              <div className="flex gap-3">
                <button type="button" onClick={() => field.onChange(true)}
                  className={cn("flex-1 h-12 rounded-xl font-bold transition-all border-2", field.value === true ? "bg-primary/10 border-primary text-primary shadow-sm" : "bg-card border-border/50 text-muted-foreground hover:bg-secondary")}>
                  예
                </button>
                <button type="button" onClick={() => field.onChange(false)}
                  className={cn("flex-1 h-12 rounded-xl font-bold transition-all border-2", field.value === false ? "bg-primary/10 border-primary text-primary shadow-sm" : "bg-card border-border/50 text-muted-foreground hover:bg-secondary")}>
                  아니오
                </button>
              </div>
            </FormControl>
          </FormItem>
        )} />
      </div>
    </>
  );
}
