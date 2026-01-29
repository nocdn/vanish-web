import { v } from "convex/values";

import { api, internal } from "./_generated/api";
import { action, internalMutation, query } from "./_generated/server";

const insertingArgs = {
	email: v.string(),
	expiry: v.optional(v.number()),
	comment: v.optional(v.string()),
	cloudflareRuleId: v.optional(v.string()),
};

export const getEmails = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("emails").collect();
	},
});

export const getEmailByEmail = query({
	args: { email: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("emails")
			.withIndex("by_email", (q) => q.eq("email", args.email))
			.unique();
	},
});

export const listEmails = query({
	// Validators for arguments.
	args: {
		count: v.number(),
	},

	// Query implementation.
	handler: async (ctx, args) => {
		// Read the database as many times as you need here.
		// See https://docs.convex.dev/database/reading-data.
		const numbers = await ctx.db
			.query("emails")
			// Ordered by _creationTime, return most recent
			.order("desc")
			.take(args.count);
		return {
			viewer: (await ctx.auth.getUserIdentity())?.name ?? null,
			numbers: numbers.reverse().map((number) => number.email),
		};
	},
});

export const addEmail = internalMutation({
	// Validators for arguments.
	args: insertingArgs,

	// Mutation implementation.
	handler: async (ctx, args) => {
		// Insert or modify documents in the database here.
		// Mutations can also read from the database like queries.
		// See https://docs.convex.dev/database/writing-data.

		if (args.expiry === null) {
			args.expiry = undefined;
		}

		if (args.comment === null) {
			args.comment = undefined;
		}

		const id = await ctx.db.insert("emails", {
			email: args.email,
			expiry: args.expiry,
			comment: args.comment,
			cloudflareRuleId: args.cloudflareRuleId,
		});

		console.log("Added new email with id:", id);
		return id;
	},
});

export const createEmailRoute = action({
	// Validators for arguments.
	args: insertingArgs,

	// Action implementation.
	handler: async (ctx, args) => {
		// // Use the browser-like `fetch` API to send HTTP requests.
		// // See https://docs.convex.dev/functions/actions#calling-third-party-apis-and-using-bun-packages.
		// const response = await ctx.fetch("https://api.thirdpartyservice.com");
		// const data = await response.json();

		const ZONE = process.env.CLOUDFLARE_ZONE_ID;
		const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
		const DOMAIN = process.env.DOMAIN;
		const DESTINATION = process.env.DESTINATION_EMAIL;

		const headers = {
			Authorization: `Bearer ${TOKEN}`,
			"Content-Type": "application/json",
		};

		const formedEmail = `${args.email}@${DOMAIN}`;

		const payload = {
			actions: [{ type: "forward", value: [DESTINATION] }],
			matchers: [{ field: "to", type: "literal", value: formedEmail }],
			enabled: true,
			name: "vanish",
			priority: 50,
		};

		const response = await fetch(
			`https://api.cloudflare.com/client/v4/zones/${ZONE}/email/routing/rules`,
			{
				method: "POST",
				body: JSON.stringify(payload),
				headers: headers,
			},
		);

		const data = await response.json();
		console.log(data);

		const cloudflareRuleId = data.result?.id;

		const insertedId = await ctx.runMutation(internal.emails.addEmail, {
			email: formedEmail,
			comment: args.comment,
			expiry: args.expiry,
			cloudflareRuleId,
		});

		if (args.expiry) {
			await ctx.scheduler.runAt(args.expiry, api.emails.deleteEmail, {
				id: insertedId,
			});
		}

		return data;
	},
});

export const deleteEmailFromDb = internalMutation({
	args: { id: v.id("emails") },
	handler: async (ctx, args) => {
		await ctx.db.delete(args.id);
	},
});

export const deleteEmail = action({
	args: { id: v.id("emails") },
	handler: async (ctx, args) => {
		const email = await ctx.runQuery(api.emails.getEmailById, { id: args.id });
		if (!email) {
			console.log("Email not found:", args.id);
			return;
		}

		if (email.cloudflareRuleId) {
			const ZONE = process.env.CLOUDFLARE_ZONE_ID;
			const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

			const response = await fetch(
				`https://api.cloudflare.com/client/v4/zones/${ZONE}/email/routing/rules/${email.cloudflareRuleId}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${TOKEN}`,
						"Content-Type": "application/json",
					},
				},
			);

			const data = await response.json();
			console.log("Cloudflare delete response:", data);
		}

		await ctx.runMutation(internal.emails.deleteEmailFromDb, { id: args.id });
	},
});

export const getEmailById = query({
	args: { id: v.id("emails") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const updateEmailInDb = internalMutation({
	args: {
		id: v.id("emails"),
		expiry: v.optional(v.number()),
		comment: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, {
			expiry: args.expiry,
			comment: args.comment,
		});
	},
});

export const updateEmail = action({
	args: {
		id: v.id("emails"),
		expiry: v.optional(v.number()),
		comment: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const email = await ctx.runQuery(api.emails.getEmailById, { id: args.id });
		if (!email) {
			console.log("Email not found:", args.id);
			return;
		}

		await ctx.runMutation(internal.emails.updateEmailInDb, {
			id: args.id,
			expiry: args.expiry,
			comment: args.comment,
		});

		if (args.expiry && args.expiry !== email.expiry) {
			await ctx.scheduler.runAt(args.expiry, api.emails.deleteEmail, {
				id: args.id,
			});
		}
	},
});
