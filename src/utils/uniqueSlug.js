import { makeSlug } from "./slugify.js";

export async function createUniqueSlug(Model, value, currentId = null) {
  const base = makeSlug(value) || "item";
  let slug = base;
  let suffix = 1;

  while (true) {
    const query = { slug };
    if (currentId) query._id = { $ne: currentId };
    const exists = await Model.exists(query);
    if (!exists) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}
