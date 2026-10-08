"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createWorker } from "@/server/actions/worker";
import { Plus, UserPlus, Loader2, X } from "lucide-react";

interface OnboardWorkerDialogProps {
  organizationId: string;
}

export function OnboardWorkerDialog({ organizationId }: OnboardWorkerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("Electrical, Plumbing");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await createWorker({
        organizationId,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        skills: skillsArray.length > 0 ? skillsArray : ["General Maintenance"],
      });

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setIsOpen(false);
        setFullName("");
        setEmail("");
        setPhone("");
        setSkills("Electrical, Plumbing");
      }
    } catch {
      setErrorMsg("Failed to onboard technician.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 flex items-center justify-center gap-1.5 w-full sm:w-auto"
      >
        <UserPlus className="w-4 h-4" />
        Onboard Technician
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 text-left border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Onboard Certified Technician
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Official Email Address *
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@dept.gov.in"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contact Phone Number *
                </label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Skills & Specialties (comma separated)
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Road Repair, Asphalt, Heavy Equipment"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded border border-red-200">
                  {errorMsg}
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                  className="text-xs w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Register Technician
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
