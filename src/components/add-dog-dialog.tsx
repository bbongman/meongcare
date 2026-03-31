import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useAddDog, dogSchema, type DogInput } from "@/hooks/use-dogs";
import { useToast } from "@/hooks/use-toast";
import { DogFormFields } from "@/components/dog-form-fields";

interface AddDogDialogProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function AddDogDialog({ children, onSuccess }: AddDogDialogProps) {
  const [open, setOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const addDog = useAddDog();

  const form = useForm<DogInput>({
    resolver: zodResolver(dogSchema),
    defaultValues: {
      name: "",
      breed: "",
      age: "" as any,
      gender: "male",
      weight: "" as any,
      neutered: false,
      photo: null,
    },
  });

  const onSubmit = (data: DogInput) => {
    addDog.mutate(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        setPhotoPreview(null);
        toast({
          title: "반려견 등록 완료!",
          description: `${data.name}의 프로필이 추가되었습니다.`,
        });
        onSuccess?.();
      },
      onError: () => {
        toast({ title: "등록 실패", description: "다시 시도해주세요.", variant: "destructive" });
      },
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
      setPhotoPreview(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 rounded-[2rem] shadow-2xl">
        <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border/50 px-6 py-4 flex items-center justify-between">
          <DialogTitle className="text-xl font-bold font-display tracking-wide text-foreground">
            반려견 등록
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-secondary hover:bg-secondary/80"
            onClick={() => handleOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <DogFormFields
                form={form}
                photoPreview={photoPreview}
                onPhotoChange={(preview, base64) => {
                  setPhotoPreview(preview);
                  form.setValue("photo", base64);
                }}
              />
              <div className="pt-4 pb-2">
                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all bg-gradient-to-r from-primary to-orange-500"
                  disabled={addDog.isPending}
                >
                  {addDog.isPending ? "등록 중..." : "등록하기"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
