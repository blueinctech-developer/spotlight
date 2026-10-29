import { describe, expect, it } from "vitest";
import { blockSchema, collectMediaIds, collectRefs, createBlock, isAllowedEmbed, parseBlocks, youtubeEmbedUrl } from "@/lib/blocks/schema";

describe("block schema", () => {
  it("fills defaults when creating blocks of every type", () => {
    const types = (blockSchema.options as unknown as { shape: { type: { value: string } } }[]).map((o) => o.shape.type.value);
    expect(types.length).toBeGreaterThan(25);
    for (const type of types) {
      const b = createBlock(type as "heading", `id-${type}`) as { type: string; hidden: boolean };
      expect(b.type).toBe(type);
      expect(b.hidden).toBe(false);
    }
  });

  it("drops invalid blocks instead of failing the whole page", () => {
    const { blocks, errors } = parseBlocks([
      { id: "a", type: "heading", text: "Hello" },
      { id: "b", type: "nonsense" },
      { id: "c", type: "heading", level: "h9" },
    ]);
    expect(blocks.map((b) => b.id)).toEqual(["a"]);
    expect(errors).toHaveLength(2);
  });

  it("rejects over-long fields", () => {
    expect(blockSchema.safeParse({ id: "x", type: "heading", text: "a".repeat(301) }).success).toBe(false);
  });

  it("collects media and references, including inside columns", () => {
    const { blocks } = parseBlocks([
      { id: "1", type: "hero", image: "m1" },
      { id: "2", type: "gallery", images: [{ image: "m2" }, { image: "m3" }] },
      { id: "3", type: "columns", columns: [{ blocks: [{ id: "4", type: "image", image: "m4" }, { id: "5", type: "speakers", speakerIds: ["s1"] }] }] },
      { id: "6", type: "partners", groups: [{ heading: "A", partnerIds: ["p1", "p2"] }] },
      { id: "7", type: "schedule", eventId: "e1" },
    ]);
    expect(collectMediaIds(blocks).sort()).toEqual(["m1", "m2", "m3", "m4"]);
    expect(collectRefs(blocks)).toEqual({ partners: ["p1", "p2"], speakers: ["s1"], testimonials: [], events: ["e1"] });
  });
});

describe("embeds", () => {
  it("only allows known https hosts", () => {
    expect(isAllowedEmbed("https://docs.google.com/forms/d/e/x/viewform")).toBe(true);
    expect(isAllowedEmbed("http://docs.google.com/forms")).toBe(false);
    expect(isAllowedEmbed("https://evil.example/forms")).toBe(false);
    expect(isAllowedEmbed("javascript:alert(1)")).toBe(false);
  });
  it("converts YouTube URLs to privacy-friendly embeds", () => {
    expect(youtubeEmbedUrl("https://youtu.be/ISRj4chtkpw")).toBe("https://www.youtube-nocookie.com/embed/ISRj4chtkpw?autoplay=1&rel=0");
    expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=BEh7BWi5oTk")).toContain("/embed/BEh7BWi5oTk");
    expect(youtubeEmbedUrl("https://vimeo.com/1")).toBeNull();
  });
});
