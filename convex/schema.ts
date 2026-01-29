import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	emails: defineTable({
		email: v.string(),
		expiry: v.optional(v.number()),
		comment: v.optional(v.string()),
		cloudflareRuleId: v.optional(v.string()),
	}).index("by_email", ["email"]),
});
