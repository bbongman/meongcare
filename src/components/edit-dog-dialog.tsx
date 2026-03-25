import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useUpdateDog, useDeleteDog, dogSchema, type DogInput, type Dog } from "@/hooks/use-dogs";
import { useToast } from "@/hooks/use-toast";
import { DogFormFields } from "@/components/dog-form-fields";

interface EditDogDialogProps {
  dog: Dog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDogDialog({ dog, open, onOpenChange }: EditDogDialogProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(dog?.photo ?? null);
  const { toast } = useToast();
  const updateDog = useUpdateDog();
  const deleteDog = useDeleteDog();

  const form = useForm<DogInput>({
    resolver: zodResolver(dogSchema),
    defaultValues: {
      name: dog?.name ?? "",
      breed: dog?.breed ?? "",
      age: dog?.age ?? (0 as any),
      gender: dog?.gender ?? "male",
      weight: dog?.weight ?? (0 as any),
      neutered: dog?.neutered ?? false,
      photo: dog?.photo ?? null,
    },
  });

  if (!dog) return null;

  const onSubmit = (data: DogInput) => {
    updateDog.mutate({ id: dog.id, data }, {
      onSuccess: () => {
        onOpenChange(false);
        toast({ title: "수정 완료!", description: `${data.name}의 정보가 업데이트됐어요.` });
      },
      onError: () => {
        toast({ title: "수정 실패", description: "다시 시도해주세요.", variant: "destructive" });
      },
    });
  };

  const handleDelete = () => {
    if (!confirm(`${dog.name}을(를) 삭제할까요? 이 작업은 되돌릴 수 없어요.`)) return;
    deleteDog.mutate(dog.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast({ title: "삭제 완료", description: `${dog.name}의 프로필이 삭제됐어요.` });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 rounded-[2rem] shadow-2xl">
        <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border/50 px-6 py-4 flex items-center justify-between">
          <DialogTitle className="text-xl font-bold font-display tracking-wide text-foreground">
            프로필 수정
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-secondary hover:bg-secondary/80"
            onClick={() => onOpenChange(false)}
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
              <div className="pt-4 pb-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 px-4 rounded-2xl border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300"
                  onClick={handleDelete}
                  disabled={deleteDog.isPending}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-orange-500"
                  disabled={updateDog.isPending}
                >
                  {updateDog.isPending ? "저장 중..." : "저장하기"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
