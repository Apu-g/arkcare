"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createDoctorProfile } from "@/actions/doctorActions";
import { AlertCircle, Stethoscope, User, GraduationCap, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const CATEGORIES = [
  "Cardiology",
  "Dermatology", 
  "Pediatrics",
  "Orthopedics",
  "Neurology",
  "Gynecology",
  "ENT",
  "Psychiatry",
  "General Medicine",
  "Surgery"
];

const DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00"
];

export default function DoctorOnboarding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    specialization: "",
    category: "",
    experience: "",
    qualifications: "",
    consultationFee: "",
    availability: DAYS.map(day => ({ day, slots: [], selected: false }))
  });

  // The account already knows who this doctor is.
  useEffect(() => {
    if (user?.fullName) {
      setFormData(prev => (prev.name ? prev : { ...prev, name: user.fullName }));
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDayToggle = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.map((avail, index) => 
        index === dayIndex 
          ? { ...avail, selected: !avail.selected, slots: !avail.selected ? [] : avail.slots }
          : avail
      )
    }));
  };

  const handleSlotToggle = (dayIndex, slot) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.map((avail, index) => 
        index === dayIndex 
          ? {
              ...avail,
              slots: avail.slots.includes(slot)
                ? avail.slots.filter(s => s !== slot)
                : [...avail.slots, slot].sort()
            }
          : avail
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const qualificationsArray = formData.qualifications
        .split(',')
        .map(q => q.trim())
        .filter(q => q.length > 0);

      const availabilityData = formData.availability
        .filter(avail => avail.selected && avail.slots.length > 0)
        .map(avail => ({
          day: avail.day,
          slots: avail.slots
        }));

      const doctorData = {
        name: formData.name,
        phone: formData.phone,
        specialization: formData.specialization,
        category: formData.category,
        experience: parseInt(formData.experience),
        qualifications: qualificationsArray,
        consultationFee: parseFloat(formData.consultationFee),
        availability: availabilityData
      };

      await createDoctorProfile(doctorData);
    } catch (error) {
      console.error("Error creating profile:", error);
      setError(error.message || "Could not create doctor profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nm-stack mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* This page renders outside CareQuestShell, so it supplies its own page
          padding. Everything below the root uses the shared nm-* primitives. */}
        <section className="nm-dark-card p-6 text-center md:p-7">
          <div className="nm-stat-icon mx-auto">
            <Stethoscope className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="cq-pixel-label bg-[rgba(255,255,255,0.10)] text-[rgba(255,255,255,0.88)]">Doctor onboarding</span>
            <span className="cq-pixel-label bg-[rgba(255,255,255,0.10)] text-[rgba(255,255,255,0.88)]">Profile quest</span>
          </div>
          <h1 className="mt-3 text-[20px] font-bold leading-tight tracking-[-0.01em] text-[#fff] md:text-[22px]">
            Build your care profile
          </h1>
          <p className="mx-auto mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--dark-muted)]">
            Complete credentials, consultation details, and availability so patients can discover and book you.
          </p>
          <div className="mx-auto mt-5 max-w-sm">
            <div className="progress-track"><span /></div>
            <p className="mt-2 text-[11px] text-[var(--dark-muted)]">Profile setup · verification comes next</p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="nm-stack">
          {/* Personal Information */}
          <Card className="cq-card gap-0 border-0 p-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5">
                <div className="nm-stat-icon">
                  <User className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <span className="text-[14px]">Personal information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="nm-stack">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="phone">Phone number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card className="cq-card gap-0 border-0 p-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5">
                <div className="nm-stat-icon">
                  <GraduationCap className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <span className="text-[14px]">Professional information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="nm-stack">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization *</Label>
                  <Input
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) => handleInputChange('specialization', e.target.value)}
                    placeholder="e.g. Internal Medicine"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger
                      id="category"
                      className="h-10 w-full rounded-[14px] border border-transparent bg-[var(--surface-subtle)] px-3.5 text-[14px] text-[var(--text)] shadow-[var(--shadow-inset)] focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category.toLowerCase()}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="experience">Years of experience *</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    value={formData.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="consultationFee">Consultation fee (₹) *</Label>
                  <Input
                    id="consultationFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.consultationFee}
                    onChange={(e) => handleInputChange('consultationFee', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualifications">Qualifications *</Label>
                <Textarea
                  id="qualifications"
                  className="min-h-[120px]"
                  value={formData.qualifications}
                  onChange={(e) => handleInputChange('qualifications', e.target.value)}
                  placeholder="Enter qualifications separated by commas (e.g. MBBS, MD Internal Medicine, Fellowship in Cardiology)"
                  required
                />
                <p className="text-[11px] text-muted-foreground">Separate multiple qualifications with commas</p>
              </div>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card className="cq-card gap-0 border-0 p-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5">
                <div className="nm-stat-icon">
                  <Clock className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <span className="text-[14px]">Availability</span>
              </CardTitle>
              <CardDescription>
                Select the days and time slots when you are available for consultations
              </CardDescription>
            </CardHeader>
            <CardContent className="nm-stack">
              {formData.availability.map((dayAvail, dayIndex) => (
                <div key={dayAvail.day} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={dayAvail.day}
                      checked={dayAvail.selected}
                      onCheckedChange={() => handleDayToggle(dayIndex)}
                      className="size-5 border-[var(--border-strong)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)]"
                    />
                    <Label htmlFor={dayAvail.day} className="text-[13px] font-semibold text-[var(--text-strong)]">
                      {dayAvail.day}
                    </Label>
                  </div>

                  {dayAvail.selected && (
                    <div className="ml-8 space-y-3">
                      <p className="text-[12px] text-muted-foreground">Select available time slots:</p>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                        {TIME_SLOTS.map((slot) => (
                          <Button
                            key={slot}
                            type="button"
                            variant={dayAvail.slots.includes(slot) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSlotToggle(dayIndex, slot)}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                      {dayAvail.slots.length > 0 && (
                        <p className="text-[12px] font-semibold text-[var(--success)]">
                          Selected: {dayAvail.slots.length} slots
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[16px] bg-[var(--destructive-soft)] px-4 py-3 text-[12px] leading-relaxed text-[var(--destructive)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              {error}
            </div>
          )}

          {/* Submit */}
          <Card className="cq-card gap-0 border-0 p-0">
            <CardContent className="p-6 text-center">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Creating Profile..." : "Submit for Review"}
              </Button>
              <p className="mt-4 text-center text-[12px] text-muted-foreground">
                Your profile will be reviewed by our team and you&apos;ll be notified once approved.
              </p>
            </CardContent>
          </Card>
        </form>
    </div>
  );
}
