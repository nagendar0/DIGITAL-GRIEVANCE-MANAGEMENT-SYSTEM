"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, ShieldCheck, Compass, Sparkles, Building, Lock } from "lucide-react";

interface FAQItem {
  id: string;
  category: "Verification" | "AI & Privacy" | "Workflow";
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "faq-1",
    category: "Verification",
    question: "How does GPS Haversine verification prevent fake civic repairs?",
    answer:
      "When a field technician attempts to submit repair proof, ResolveAI queries their browser device's high-precision GPS hardware. The backend calculates the great-circle surface distance using the Haversine trigonometric formula between the citizen's original locked coordinates and the technician's live location. If the distance exceeds 100 meters, the submission is rejected instantly, making remote or fabricated closures mathematically impossible.",
  },
  {
    id: "faq-2",
    category: "Workflow",
    question: "Can a field technician mark their own grievance as Closed?",
    answer:
      "No. Our state machine strictly prohibits self-closure. Field workers can only transition a grievance from IN_PROGRESS to RESOLVED by providing mandatory after-photo evidence, work notes, and live GPS proof. Only a verified municipal supervisor or department officer has the authority to inspect the proof and approve closure.",
  },
  {
    id: "faq-3",
    category: "AI & Privacy",
    question: "What is Gemini 2.5 Flash's exact role in grievance resolution?",
    answer:
      "Gemini 2.5 Flash operates strictly in an advisory and triage capacity. Upon citizen submission, it analyzes photographs and descriptions to suggest the grievance category, severity level, and responsible department. When technicians submit completion evidence, Gemini performs multimodal image comparison to assist human supervisors in detecting discrepancies. AI has zero autonomous authority to close or discard complaints.",
  },
  {
    id: "faq-4",
    category: "AI & Privacy",
    question: "Is citizen personal information visible on the Public Transparency Portal?",
    answer:
      "Never. The Public Transparency Portal runs on a privacy-safe projection layer. Citizen names, phone numbers, user IDs, and precise private dwelling details are completely redacted. Only general locality landmarks, category, verified before/after photographs, and resolution turnaround times are open for public civic accountability.",
  },
  {
    id: "faq-5",
    category: "Workflow",
    question: "What happens if a field repair is substandard or incomplete?",
    answer:
      "If the organization supervisor finds that the repair is inadequate, or if the AI visual comparison detects that the pothole or damaged infrastructure is still present, the officer issues a formal Rework Order. The state machine shifts the status back to IN_PROGRESS, generates an audit notification, and instructs the technician to re-attend the site.",
  },
  {
    id: "faq-6",
    category: "Verification",
    question: "How do municipal bodies, utilities, and departments onboard?",
    answer:
      "Authorized civic bodies register through our Organization Onboarding portal with their official domain and jurisdictional credentials. Every application is submitted into an administrative review pipeline, where Platform Admins verify municipal legitimacy before activating the organization's command center.",
  },
];

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>("faq-1");
  const [activeTab, setActiveTab] = useState<string>("All");

  const categories = ["All", "Verification", "AI & Privacy", "Workflow"];

  const filteredItems = activeTab === "All" 
    ? FAQ_ITEMS 
    : FAQ_ITEMS.filter((item) => item.category === activeTab);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="scroll-mt-20 py-16 sm:py-24 bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Everything you need to know about mathematical GPS verification, AI triage, and accountability.
          </p>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === category
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Accordion Container */}
        <div className="space-y-3 sm:space-y-4 max-w-3xl mx-auto">
          {filteredItems.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "border-blue-300 bg-blue-50/20 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between p-3.5 sm:p-5 text-left text-slate-900 font-semibold text-xs sm:text-base gap-3 sm:gap-4 min-h-[48px]"
                >
                  <span className="flex items-center gap-2.5 sm:gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    {item.question}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3.5 sm:px-5 pb-3.5 sm:pb-5 pt-0 text-slate-600 text-xs sm:text-sm leading-relaxed border-t border-blue-100/60 mt-1 pt-3">
                    <p>{item.answer}</p>
                    <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        {item.category}
                      </span>
                      <span>&bull;</span>
                      <span>Verified Policy Rule</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Help Note */}
        <div className="mt-8 sm:mt-12 text-center p-4 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/80 max-w-xl mx-auto">
          <p className="text-xs text-slate-600 font-medium">
            Still have questions about institutional deployment or city municipal integrations?
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <a
              href="mailto:contact@resolveai.internal"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Contact Municipal Engineering &rarr;
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
