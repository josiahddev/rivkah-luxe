import { requireAdmin } from "@/lib/auth/session";
import { getSections, getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { AnnouncementForm, SectionForm } from "@/components/admin/content-forms";

export const metadata = { title: "Homepage" };

export default async function HomepageEditor() {
  await requireAdmin("content");
  const [s, settings] = await Promise.all([getSections(), getSettings()]);
  return (
    <>
      <PageHeader
        title="Homepage"
        description="Edit each part of your homepage from top to bottom. Untick “Show this section” to hide one."
        back={{ href: "/admin/content", label: "Website content" }}
        actions={<a href="/" target="_blank" className="rounded-md border border-line bg-white px-4 py-2.5 text-sm hover:border-ink">View homepage ↗</a>}
      />
      <div className="space-y-6">
        <AnnouncementForm enabled={settings.announcement.enabled} messages={settings.announcement.messages} link={settings.announcement.link} />
        <SectionForm
          sectionKey="hero"
          title="1. Hero (top of the page)"
          description="The first thing visitors see. Use a tall, high-quality photo or a short muted video."
          visible={s.hero.isVisible}
          fields={[
            { name: "mediaType", label: "Show", type: "select", options: [{ value: "image", label: "A photo" }, { value: "video", label: "A video (with the photo as cover)" }], value: s.hero.mediaType },
            { name: "imageUrl", label: "Photo", type: "image", value: s.hero.imageUrl },
            { name: "videoUrl", label: "Video link (.mp4)", value: s.hero.videoUrl, hint: "Only used when “A video” is chosen. Upload the video to your storage and paste its link." },
            { name: "eyebrow", label: "Small text above the headline", value: s.hero.eyebrow },
            { name: "heading", label: "Headline", value: s.hero.heading },
            { name: "subheading", label: "Text under the headline", type: "textarea", value: s.hero.subheading },
            { name: "ctaText", label: "Main button text", value: s.hero.ctaText },
            { name: "ctaLink", label: "Main button link", value: s.hero.ctaLink },
            { name: "secondaryCtaText", label: "Second button text", value: s.hero.secondaryCtaText },
            { name: "secondaryCtaLink", label: "Second button link", value: s.hero.secondaryCtaLink },
          ]}
        />
        <SectionForm sectionKey="featured" title="2. Featured products" description="Shows products you tick “Feature on homepage” for." visible={s.featured.isVisible}
          fields={[{ name: "heading", label: "Heading", value: s.featured.heading }, { name: "subheading", label: "Text", value: s.featured.subheading }, { name: "count", label: "How many products", type: "number", value: String(s.featured.count) }]} />
        <SectionForm sectionKey="categories" title="3. Shop by category" description="Shows categories set to “Show on the homepage”." visible={s.categories.isVisible}
          fields={[{ name: "heading", label: "Heading", value: s.categories.heading }, { name: "subheading", label: "Text", value: s.categories.subheading }]} />
        <SectionForm sectionKey="bestSellers" title="4. Best sellers" description="Filled automatically with your top-selling products." visible={s.bestSellers.isVisible}
          fields={[{ name: "heading", label: "Heading", value: s.bestSellers.heading }, { name: "subheading", label: "Text", value: s.bestSellers.subheading }, { name: "count", label: "How many products", type: "number", value: String(s.bestSellers.count) }]} />
        <SectionForm
          sectionKey="promoBanner"
          title="5. Promotional banner"
          description="If a promotion is live and set to “Show as banner”, it replaces this automatically."
          visible={s.promoBanner.isVisible}
          fields={[
            { name: "imageUrl", label: "Photo", type: "image", value: s.promoBanner.imageUrl },
            { name: "eyebrow", label: "Small label", value: s.promoBanner.eyebrow },
            { name: "heading", label: "Headline", value: s.promoBanner.heading },
            { name: "text", label: "Text", type: "textarea", value: s.promoBanner.text },
            { name: "ctaText", label: "Button text", value: s.promoBanner.ctaText },
            { name: "ctaLink", label: "Button link", value: s.promoBanner.ctaLink },
          ]}
        />
        <SectionForm sectionKey="newArrivals" title="6. New arrivals" description="Filled automatically with your newest products." visible={s.newArrivals.isVisible}
          fields={[{ name: "heading", label: "Heading", value: s.newArrivals.heading }, { name: "subheading", label: "Text", value: s.newArrivals.subheading }, { name: "count", label: "How many products", type: "number", value: String(s.newArrivals.count) }]} />
        <SectionForm
          sectionKey="brandStory"
          title="7. Brand story"
          visible={s.brandStory.isVisible}
          fields={[
            { name: "imageUrl", label: "Photo", type: "image", value: s.brandStory.imageUrl },
            { name: "eyebrow", label: "Small label", value: s.brandStory.eyebrow },
            { name: "heading", label: "Headline", value: s.brandStory.heading },
            { name: "body", label: "Story", type: "textarea", value: s.brandStory.body },
            { name: "ctaText", label: "Button text", value: s.brandStory.ctaText },
            { name: "ctaLink", label: "Button link", value: s.brandStory.ctaLink },
          ]}
        />
        <SectionForm sectionKey="testimonials" title="8. Testimonials" description="Shows reviews you feature (Reviews → ★ Feature on homepage)." visible={s.testimonials.isVisible}
          fields={[{ name: "heading", label: "Heading", value: s.testimonials.heading }, { name: "subheading", label: "Text", value: s.testimonials.subheading }]} />
        <SectionForm
          sectionKey="social"
          title="9. Instagram photos"
          description="Up to 6 photos. They link to your Instagram (set the link in Settings → Social)."
          visible={s.social.isVisible}
          fields={[
            { name: "heading", label: "Heading", value: s.social.heading },
            { name: "text", label: "Small label", value: s.social.text },
            { name: "images", label: "Photos", type: "images", values: s.social.images },
          ]}
        />
      </div>
    </>
  );
}
