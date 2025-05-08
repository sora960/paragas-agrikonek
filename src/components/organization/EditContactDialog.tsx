import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { organizationService } from "@/services/organizationService";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface ContactInfo {
  contact_person: string;
  contact_email: string;
  contact_phone: string;
}

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  initialData: ContactInfo;
  onContactUpdated: () => void;
}

export default function EditContactDialog({
  open,
  onOpenChange,
  organizationId,
  initialData,
  onContactUpdated
}: EditContactDialogProps) {
  const { toast } = useToast();
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    contact_person: initialData.contact_person || "",
    contact_email: initialData.contact_email || "",
    contact_phone: initialData.contact_phone || ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContactInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      const success = await organizationService.updateOrganization(
        organizationId,
        {
          contact_person: contactInfo.contact_person,
          contact_email: contactInfo.contact_email,
          contact_phone: contactInfo.contact_phone
        }
      );
      
      if (success) {
        toast({
          title: "Contact Updated",
          description: "Contact information has been updated successfully",
        });
        onContactUpdated();
        onOpenChange(false);
      } else {
        throw new Error("Failed to update contact information");
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: "Error",
        description: "Failed to update contact information",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Contact Information</DialogTitle>
            <DialogDescription>
              Update the contact details for this organization
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                name="contact_person"
                value={contactInfo.contact_person}
                onChange={handleChange}
                placeholder="Enter contact person name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="contact_email">Email</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                value={contactInfo.contact_email}
                onChange={handleChange}
                placeholder="Enter contact email"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="contact_phone">Phone</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                value={contactInfo.contact_phone}
                onChange={handleChange}
                placeholder="Enter contact phone number"
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 