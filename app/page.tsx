"use client";

import { useQuery } from "convex/react";
import { Loader } from "lucide-react";
import { useState } from "react";

import { api } from "../convex/_generated/api";

export default function Home() {
	const emailsData = useQuery(api.emails.getEmails);
	const emails = emailsData
		?.slice()
		.sort((a, b) => b._creationTime - a._creationTime);
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const handleCopy = (id: string, email: string) => {
		navigator.clipboard.writeText(email);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 1000);
	};

	return (
		<main className="min-h-screen bg-background px-6 py-12 md:px-12 lg:px-24">
			<div className="mx-auto max-w-2xl">
				<h1 className="mb-8 flex items-center gap-3 text-2xl font-medium tracking-tight text-foreground">
					vanish
					{!emails && (
						<Loader className="h-4 w-4 animate-spin text-muted-foreground translate-y-0.5" />
					)}
				</h1>

				{emails && emails.length === 0 ? (
					<div className="text-sm text-muted-foreground">No emails yet</div>
				) : emails ? (
					<ul className="space-y-4">
						{emails.map((email, index) => (
							<li
								key={email._id}
								className="group flex flex-col gap-1 border-b border-border pb-4 last:border-0 animate-in fade-in slide-in-from-bottom-1"
								style={{
									animationDelay: `${index * 0.02}s`,
									animationFillMode: "backwards",
								}}
							>
								<button
									type="button"
									onClick={() => handleCopy(email._id, email.email)}
									className="w-fit cursor-pointer text-left text-regular text-foreground hover:opacity-70 transition-opacity leading-none"
									style={{
										fontFamily: "var(--font-pp-supply-mono)",
										fontWeight: 340,
									}}
								>
									{copiedId === email._id ? (
										<span className="text-blue-700 leading-none">[copied]</span>
									) : (
										<>
											{email.email}
											{email.expiry && (
												<span
													className="text-blue-700 ml-2 text-[14px] font-medium opacity-80"
													style={{ fontFamily: "var(--font-jetbrains-mono)" }}
												>
													[
													{new Date(email.expiry).toLocaleDateString("en-US", {
														month: "short",
														day: "numeric",
														year: "numeric",
													})}
													]
												</span>
											)}
										</>
									)}
								</button>
								{email.comment && (
									<span
										className="text-[13px] text-muted-foreground"
										style={{ fontFamily: "var(--font-inter)" }}
									>
										{email.comment}
									</span>
								)}
							</li>
						))}
					</ul>
				) : null}
			</div>
		</main>
	);
}
