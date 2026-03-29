"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import emailjs from "@emailjs/browser";
import { toast } from "react-toastify";

import TitleHeader from "../../common/TitleHeader";
import ContactExperience from "./ContactExperience";

type ContactFormState = {
  name: string;
  email: string;
  message: string;
};

const Contact = () => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ContactFormState>({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ?? "";
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ?? "";
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ?? "";

    try {
      if (!serviceId || !templateId || !publicKey) {
        throw new Error("EmailJS is not configured. Check .env values.");
      }

      if (!formRef.current) {
        throw new Error("Contact form is not available.");
      }

      await emailjs.sendForm(serviceId, templateId, formRef.current, { publicKey });

      setForm({ name: "", email: "", message: "" });
      toast.success("Thanks for contacting IntelliLib!");
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : (error as { text?: string })?.text ?? "Unknown error";

      toast.error(`❌ Unable to send your message: ${errorText}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="flex-center section-padding">
      <div className="h-full w-full px-5 md:px-10">
        <TitleHeader
          title="Get in Touch – Let’s Connect"
          sub="💬 Have questions or ideas? Let’s talk! 🚀"
        />
        <div className="grid-12-cols mt-16">
          <div className="xl:col-span-5">
            <div className="flex-center rounded-xl p-10 border border-4 border-(--ai-card-border) bg-(--ai-card-bg) shadow-[0_25px_80px_-55px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
              <form ref={formRef} onSubmit={handleSubmit} className="contact-form flex w-full flex-col gap-7">
                <div>
                  <label htmlFor="name">Your name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="What’s your good name?"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email">Your Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="What’s your email address?"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message">Your Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="How can I help you?"
                    rows={5}
                    required
                  />
                </div>

                <button type="submit" disabled={loading}>
                  <div className="cta-button group">
                    <div className="bg-circle" />
                    <p className="text">{loading ? "Sending..." : "Send Message"}</p>
                    <div className="arrow-wrapper">
                      <img src="/images/contact/arrow-down.svg" alt="arrow" />
                    </div>
                  </div>
                </button>
              </form>
            </div>
          </div>
          <div className="min-h-96 xl:col-span-7">
            <div className="h-full w-full rounded-3xl bg-[#f2a74a] dark:bg-[#cd7c2e] shadow-[0_25px_80px_-55px_rgba(0,0,0,0.7)] hover:cursor-grab overflow-hidden">
              <ContactExperience />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
