import type { User } from "@supabase/supabase-js";
import type { CommunityAnswer } from "../data/answers";
import type { Scenario } from "../data/scenarios";
import { supabase } from "./supabase";

type CommunityAnswerRow = {
  id: string;
  answer: string;
  author_name: string;
  likes: number;
  created_at: string;
  unexpected: boolean;
};

export async function fetchPublishedScenarios(): Promise<Scenario[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("scenarios")
    .select("id, category, title, description, prompt, tag, trending")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({ ...row, count: 0 }));
}

export async function fetchCommunityAnswers(
  scenarioId: string | number
): Promise<CommunityAnswer[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("community_answers")
    .select("id, answer, author_name, likes, created_at, unexpected")
    .eq("scenario_id", String(scenarioId))
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as CommunityAnswerRow[]).map((row) => ({
    id: row.id,
    name: row.author_name,
    answer: row.answer,
    likes: row.likes,
    unexpected: row.unexpected,
    createdAt: row.created_at,
  }));
}

export async function submitCommunityAnswers(
  scenarioId: string | number,
  answers: string[],
  user: User
): Promise<CommunityAnswer[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("answers")
    .insert(
      answers.map((answer) => ({
        scenario_id: String(scenarioId),
        user_id: user.id,
        answer,
      }))
    )
    .select("id, answer, created_at");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: "Community member",
    answer: row.answer,
    likes: 0,
    unexpected: false,
    createdAt: row.created_at,
  }));
}

export async function toggleCommunityLike(answerId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.rpc("toggle_answer_like", {
    target_answer_id: answerId,
  });

  if (error) throw error;
}

export async function submitScenarioForReview(
  scenario: Pick<Scenario, "category" | "title" | "description" | "prompt" | "tag">,
  user: User
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("scenarios").insert({
    ...scenario,
    created_by: user.id,
    status: "pending",
  });

  if (error) throw error;
}
