import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { listScenarios, saveRun, saveScenario } from "./db";
import { dispatchLiveAction, getLiveSnapshot, getLiveUpdate } from "./liveSimulation";
import type { SimulationState } from "../shared/simulation";

const scenarioKey = z.enum(["steady", "follower-failure", "leader-isolation", "partition", "message-loss", "recovery"]);
const runSummary = z.object({ id: z.string(), scenarioName: scenarioKey, tick: z.number().int().nonnegative(), term: z.number().int().positive(), leaderId: z.string().nullable(), committed: z.number().int().nonnegative(), consistent: z.boolean(), quorum: z.number().int().positive(), available: z.number().int().nonnegative(), eventCount: z.number().int().nonnegative(), completedAt: z.number().int().positive() });
const liveAction = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("start") }), z.object({ kind: z.literal("pause") }), z.object({ kind: z.literal("step") }), z.object({ kind: z.literal("reset") }), z.object({ kind: z.literal("heal") }), z.object({ kind: z.literal("recover") }), z.object({ kind: z.literal("elect") }),
  z.object({ kind: z.literal("scenario"), scenario: scenarioKey }), z.object({ kind: z.literal("append"), command: z.string().min(1).max(120) }), z.object({ kind: z.literal("fail"), nodeId: z.string() }), z.object({ kind: z.literal("restore"), nodeId: z.string() }), z.object({ kind: z.literal("toggle-link"), source: z.string(), target: z.string() }), z.object({ kind: z.literal("partition"), left: z.array(z.string()), right: z.array(z.string()) }), z.object({ kind: z.literal("settings"), latency: z.number().min(60).max(1200).optional(), messageLoss: z.number().min(0).max(0.95).optional(), heartbeatInterval: z.number().int().min(1).max(12).optional() }),
]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  simulation: router({
    snapshot: publicProcedure.query(() => getLiveSnapshot()),
    updates: publicProcedure.input(z.object({ after: z.number().int().nonnegative() }).optional()).query(({ input }) => getLiveUpdate(input?.after ?? 0)),
    dispatch: publicProcedure.input(liveAction).mutation(({ input }) => dispatchLiveAction(input)),
    listScenarios: publicProcedure.query(({ ctx }) => listScenarios(ctx.user?.openId)),
    saveScenario: publicProcedure.input(z.object({ name: z.string().min(1).max(120), configuration: z.custom<SimulationState>() })).mutation(({ ctx, input }) => saveScenario({ ownerOpenId: ctx.user?.openId, ...input })),
    saveRun: publicProcedure.input(z.object({ summary: runSummary, status: z.enum(["completed", "interrupted", "reset"]) })).mutation(({ ctx, input }) => saveRun({ ownerOpenId: ctx.user?.openId, scenarioName: input.summary.scenarioName, summary: input.summary, status: input.status })),
  }),
});

export type AppRouter = typeof appRouter;
