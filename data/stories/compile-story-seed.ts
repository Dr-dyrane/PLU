import type {
  ClassificationChoice,
  CodeRelation,
  NearestConfusion,
  ProductPhotoRole,
  ProductPriority,
  ProductStory,
  ProductStorySource,
  RetailVariant,
} from "@/types/trace";

type StorySeedPhoto = {
  id?: string;
  file: string;
  alt: string;
  role: ProductPhotoRole;
  focus?: string;
  author?: string;
  license?: string;
};

type StorySeedClassification = {
  familyAnswer: string;
  familyChoices: ClassificationChoice[];
  formAnswer: string;
  formChoices: ClassificationChoice[];
};

type StorySeedCheckout = {
  code: string;
  soldBy: "Weight" | "Each";
  saleForm: string;
  codeScope: string;
};

type StorySeed = {
  schemaVersion: string;
  id: string;
  catalogId: string;
  title: string;
  shortTitle: string;
  family: string;
  priority: ProductPriority;
  identity: {
    family: string;
    form: string;
    color: string;
    variant: string;
  };
  checkout: StorySeedCheckout;
  photos: StorySeedPhoto[];
  visualCues: string[];
  classification: StorySeedClassification;
  variants?: RetailVariant[];
  relations?: CodeRelation[];
  similarItems: NearestConfusion[];
  source: ProductStorySource;
};

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function encodeCommonsTitle(file: string) {
  return encodeURIComponent(file).replaceAll("%2F", "/");
}

function commonsPhoto(file: string) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeCommonsTitle(file)}?width=1600`;
}

function commonsSource(file: string) {
  return `https://commons.wikimedia.org/wiki/File:${encodeCommonsTitle(file.replaceAll(" ", "_"))}`;
}

function compilePhoto(photo: StorySeedPhoto) {
  return {
    id: photo.id ?? slugify(photo.file),
    src: photo.file.startsWith("https://") ? photo.file : commonsPhoto(photo.file),
    alt: photo.alt,
    role: photo.role,
    focus: photo.focus ?? "50% 50%",
    source: {
      label: "Wikimedia Commons",
      author: photo.author ?? "Wikimedia Commons contributor",
      license: photo.license ?? "See source page",
      url: photo.file.startsWith("https://")
        ? photo.file
        : commonsSource(photo.file),
    },
  };
}

function defaultRelations(seed: StorySeed): CodeRelation[] {
  const extra = seed.variants?.[0];
  return [
    extra
      ? {
          kind: "exception",
          title: "The store may list another form separately",
          copy: `${seed.title} uses ${seed.checkout.code} here; ${extra.name} uses ${extra.code}.`,
        }
      : {
          kind: "exception",
          title: "The code follows the exact product",
          copy: `Identify ${seed.title} before retrieving ${seed.checkout.code}.`,
        },
    {
      kind: "exception",
      title: "Appearance comes before the digits",
      copy: "Use shape, color, and sale form to select the item; the checkout code is an assigned lookup.",
    },
  ];
}

export function compileStorySeed(seed: StorySeed): ProductStory {
  const photos = seed.photos.map(compilePhoto);
  const hero = photos.find((photo) => photo.role === "hero") ?? photos[0];
  if (!hero) throw new Error(`Story seed has no photographs: ${seed.id}`);
  const nearestConfusion = seed.similarItems[0];
  if (!nearestConfusion) throw new Error(`Story seed has no comparison items: ${seed.id}`);
  const saleAnswer = seed.checkout.soldBy.toLowerCase();
  const primary: RetailVariant = {
    id: "primary",
    name: seed.identity.variant,
    code: seed.checkout.code,
    soldBy: seed.checkout.soldBy,
    scope: "primary",
    note: "The lesson target.",
    sourcePages: seed.source.primaryPages,
  };

  return {
    schemaVersion: seed.schemaVersion,
    id: seed.id,
    catalogId: seed.catalogId,
    title: seed.title,
    shortTitle: seed.shortTitle,
    family: seed.family,
    priority: seed.priority,
    image: hero.src,
    alt: hero.alt,
    photos,
    identity: seed.identity,
    checkout: {
      ...seed.checkout,
      summary:
        seed.checkout.soldBy === "Weight"
          ? `Use ${seed.checkout.code} for ${seed.title.toLowerCase()} when it is sold by weight.`
          : `Use ${seed.checkout.code} for ${seed.title.toLowerCase()} when it is sold one at a time.`,
    },
    visualCues: seed.visualCues,
    storyBeats: [
      {
        id: "family",
        label: "Family",
        value: seed.identity.family,
        copy: `Recognize the ${seed.family.toLowerCase()} family before choosing the exact listing.`,
        basis: "workbook",
      },
      {
        id: "form",
        label: "Shape",
        value: seed.identity.form,
        copy: seed.visualCues[0],
        basis: "curated-visual",
      },
      {
        id: "variant",
        label: "Color",
        value: seed.identity.color,
        copy: seed.visualCues[1],
        basis: "curated-visual",
      },
      {
        id: "checkout",
        label: "Sold",
        value: `${seed.checkout.saleForm} · ${seed.checkout.soldBy.toLowerCase()}`,
        copy:
          seed.checkout.soldBy === "Weight"
            ? "This lesson is for the listing placed on the scale."
            : "This lesson is for the listing counted one at a time.",
        basis: "reference-sheet",
      },
    ],
    classificationPrompts: [
      {
        id: "family",
        question: "What kind of produce is this?",
        support: "Start with the broad family.",
        answer: seed.classification.familyAnswer,
        choices: seed.classification.familyChoices,
      },
      {
        id: "form",
        question: "Which one matches?",
        support: "Use the visible shape, color, and size together.",
        answer: seed.classification.formAnswer,
        choices: seed.classification.formChoices,
      },
      {
        id: "sale-form",
        question: "How is this one sold?",
        support: "The checkout method is part of the listing.",
        answer: saleAnswer,
        choices: [
          { id: "weight", label: "Loose · by weight" },
          { id: "each", label: "One at a time" },
          { id: "bag", label: "Prepacked bag" },
        ],
      },
    ],
    retailVariants: [primary, ...(seed.variants ?? [])],
    codeRelations: seed.relations ?? defaultRelations(seed),
    nearestConfusion,
    similarItems: seed.similarItems,
    source: seed.source,
  };
}

export function compileStorySeeds(raw: unknown): ProductStory[] {
  return (raw as StorySeed[]).map(compileStorySeed);
}
