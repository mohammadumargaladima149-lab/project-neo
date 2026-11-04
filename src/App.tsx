import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  categories,
  scenarios,
  type Scenario,
} from "./data/scenarios";
import {
  initialAnswers,
  type CommunityAnswer,
} from "./data/answers";
import { readStoredValue, writeStoredValue } from "./data/storage";
import {
  fetchCommunityAnswers,
  fetchPublishedScenarios,
  submitCommunityAnswers,
  submitScenarioForReview,
  toggleCommunityLike,
} from "./lib/community";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const ANSWERS_STORAGE_KEY = "project-neo.answers.v1";
const SCENARIOS_STORAGE_KEY = "project-neo.scenarios.v1";

type Screen =
  | "home"
  | "answer"
  | "reveal"
  | "community"
  | "explore"
  | "create"
  | "signin";

type SortMode = "liked" | "newest" | "unexpected";

function App(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [availableScenarios, setAvailableScenarios] = useState<Scenario[]>(
    () => readStoredValue(SCENARIOS_STORAGE_KEY, scenarios)
  );
  const [screen, setScreen] = useState<Screen>("explore");
  const [selectedScenario, setSelectedScenario] =
    useState<Scenario>(() => readStoredValue(SCENARIOS_STORAGE_KEY, scenarios)[0]);
  const [selectedCategory, setSelectedCategory] =
    useState("All");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] =
    useState<SortMode>("liked");

  const [questionOne, setQuestionOne] = useState("");
  const [questionTwo, setQuestionTwo] = useState("");
  const [questionThree, setQuestionThree] = useState("");

  const [communityAnswers, setCommunityAnswers] =
    useState<CommunityAnswer[]>(() =>
      readStoredValue(ANSWERS_STORAGE_KEY, initialAnswers)
    );

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] =
    useState("");
  const [createPrompt, setCreatePrompt] = useState("");
  const [createCategory, setCreateCategory] =
    useState("Deep");

  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    writeStoredValue(ANSWERS_STORAGE_KEY, communityAnswers);
  }, [communityAnswers]);

  useEffect(() => {
    writeStoredValue(SCENARIOS_STORAGE_KEY, availableScenarios);
  }, [availableScenarios]);

  useEffect(() => {
    if (!supabase) return;

    let isActive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (isActive) setUser(data.user);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      isActive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isActive = true;
    fetchPublishedScenarios()
      .then((remoteScenarios) => {
        if (isActive && remoteScenarios.length > 0) {
          setAvailableScenarios(remoteScenarios);
          setSelectedScenario((current) =>
            remoteScenarios.find((scenario) => scenario.id === current.id) ??
            remoteScenarios[0]
          );
        }
      })
      .catch((error: unknown) => {
        console.error("Could not load community scenarios:", error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isActive = true;
    fetchCommunityAnswers(selectedScenario.id)
      .then((remoteAnswers) => {
        if (isActive) setCommunityAnswers(remoteAnswers);
      })
      .catch((error: unknown) => {
        console.error("Could not load community answers:", error);
      });

    return () => {
      isActive = false;
    };
  }, [selectedScenario.id]);

  const canSubmit =
    questionOne.trim() !== "" &&
    questionTwo.trim() !== "" &&
    questionThree.trim() !== "";

  const canCreate =
    createTitle.trim() !== "" &&
    createDescription.trim() !== "" &&
    createPrompt.trim() !== "" &&
    createCategory !== "";

  const filteredScenarios = useMemo(() => {
    return availableScenarios.filter((scenario) => {
      const matchesCategory =
        selectedCategory === "All" ||
        scenario.category === selectedCategory ||
        scenario.tag === selectedCategory;

      const searchText =
        `${scenario.title} ${scenario.description} ${scenario.prompt}`
          .toLowerCase();

      const matchesSearch = searchText.includes(
        search.toLowerCase().trim()
      );

      return matchesCategory && matchesSearch;
    });
  }, [availableScenarios, selectedCategory, search]);

  const sortedAnswers = useMemo(() => {
    const answers = [...communityAnswers];

    if (sortMode === "liked") {
      return answers.sort((a, b) => b.likes - a.likes);
    }

    if (sortMode === "unexpected") {
      return answers.sort(
        (a, b) =>
          Number(Boolean(b.unexpected)) -
          Number(Boolean(a.unexpected))
      );
    }

    return answers.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      }
      return Number(b.id) - Number(a.id);
    });
  }, [communityAnswers, sortMode]);

  function openScenario(scenario: Scenario) {
    setSelectedScenario(scenario);
    setScreen("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startAnswering() {
    setQuestionOne("");
    setQuestionTwo("");
    setQuestionThree("");
    setScreen("answer");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitAnswers() {
    if (!canSubmit) return;

    if (isSupabaseConfigured && !user) {
      setAuthMessage("Sign in to add your answers to the community.");
      setScreen("signin");
      return;
    }

    try {
      setIsSubmittingAnswers(true);
      const submittedAnswers = [
        questionOne.trim(),
        questionTwo.trim(),
        questionThree.trim(),
      ];

      const newAnswers: CommunityAnswer[] =
        isSupabaseConfigured && user
          ? await submitCommunityAnswers(selectedScenario.id, submittedAnswers, user)
          : submittedAnswers.map((answer, index) => ({
              id: Date.now() + index,
              name: "You",
              answer,
              likes: 0,
            }));

      setCommunityAnswers((currentAnswers) => [...newAnswers, ...currentAnswers]);

      setScreen("reveal");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Answer submission failed:", error);
      window.alert(
        "We couldn't submit your answers. Please try again."
      );
    } finally {
      setIsSubmittingAnswers(false);
    }
  }

  async function toggleLike(id: number | string) {
    if (isSupabaseConfigured && !user) {
      setAuthMessage("Sign in to like community answers.");
      setScreen("signin");
      return;
    }

    try {
      if (isSupabaseConfigured && typeof id === "string") {
        await toggleCommunityLike(id);
        setCommunityAnswers(await fetchCommunityAnswers(selectedScenario.id));
        return;
      }

      setCommunityAnswers((currentAnswers) =>
        currentAnswers.map((answer) =>
          answer.id === id
            ? { ...answer, likes: answer.likes + 1 }
            : answer
        )
      );
    } catch (error) {
      console.error("Like update failed:", error);
      window.alert("We couldn't update your like. Please try again.");
    }
  }

  function nextScenario() {
    const currentIndex = availableScenarios.findIndex(
      (scenario) => scenario.id === selectedScenario.id
    );

    const nextIndex = (currentIndex + 1) % availableScenarios.length;

    setSelectedScenario(availableScenarios[nextIndex]);
    setQuestionOne("");
    setQuestionTwo("");
    setQuestionThree("");
    setScreen("home");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    setScreen("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goExplore() {
    setScreen("explore");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goCreate() {
    setCreateError("");
    setCreateSuccess("");
    setScreen("create");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function signInWithEmail() {
    if (!supabase) {
      setAuthMessage("Add your Supabase project settings to enable sign in.");
      return;
    }

    setAuthMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });

    setAuthMessage(error ? error.message : "Check your email for a sign-in link.");
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthMessage(error.message);
  }

  function validateCreateScenario(): string | null {
    if (!createTitle.trim()) {
      return "Please give your scenario a title.";
    }

    if (createTitle.trim().length < 5) {
      return "Your title should be at least 5 characters long.";
    }

    if (!createDescription.trim()) {
      return "Please describe what is happening in your scenario.";
    }

    if (createDescription.trim().length < 20) {
      return "Your scenario description should be a little more detailed.";
    }

    if (!createPrompt.trim()) {
      return "Please add a question for people to answer.";
    }

    if (createPrompt.trim().length < 5) {
      return "Your question should be at least 5 characters long.";
    }

    if (!createCategory) {
      return "Please choose a category.";
    }

    return null;
  }

  async function submitScenario() {
    if (isSubmitting) return;

    setCreateError("");
    setCreateSuccess("");

    const validationError = validateCreateScenario();

    if (validationError) {
      setCreateError(validationError);
      return;
    }

    if (isSupabaseConfigured && !user) {
      setAuthMessage("Sign in to submit a scenario for community review.");
      setScreen("signin");
      return;
    }

    try {
      setIsSubmitting(true);

      const newScenario: Scenario = {
        id: Date.now(),
        category: createCategory,
        title: createTitle.trim(),
        description: createDescription.trim(),
        prompt: createPrompt.trim(),
        count: 0,
        tag: createCategory,
      };

      if (isSupabaseConfigured && user) {
        await submitScenarioForReview(newScenario, user);
      } else {
        setAvailableScenarios((current) => [newScenario, ...current]);
      }

      setCreateTitle("");
      setCreateDescription("");
      setCreatePrompt("");
      setCreateCategory("Deep");

      setCreateSuccess(isSupabaseConfigured
        ? "Submitted for community review. It will appear after approval."
        : "Saved in this browser. Only you can see it on this device.");
    } catch (error) {
      console.error("Scenario submission failed:", error);
      setCreateError(
        "Something went wrong while submitting your scenario. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="app">
      <header className="site-header">
        <button
          className="brand"
          onClick={goExplore}
          type="button"
        >
          PROJECT NEO
        </button>

        <nav className="header-nav">
          <button onClick={goExplore} type="button">
            Explore
          </button>

          <button onClick={goCreate} type="button">
            Create
          </button>

          <button
            className="sign-in-button"
            onClick={user ? signOut : () => {
              setAuthMessage("");
              setScreen("signin");
            }}
            type="button"
          >
            {user ? "Sign out" : "Sign in"}
          </button>
        </nav>
      </header>

      <main>
        {screen === "signin" && (
          <section className="auth-screen">
            <div className="auth-card">
              <button className="back-button" onClick={goExplore} type="button">
                ← Back to Explore
              </button>
              <p className="eyebrow">YOUR ACCOUNT</p>
              <h1>Join the conversation.</h1>
              {user ? (
                <p className="auth-description">
                  Signed in as {user.email}. You can now answer scenarios and submit ideas.
                </p>
              ) : (
                <>
                  <p className="auth-description">
                    Enter your email and we’ll send you a secure sign-in link.
                  </p>
                  <form onSubmit={(event) => {
                    event.preventDefault();
                    void signInWithEmail();
                  }}>
                    <label htmlFor="sign-in-email">Email address</label>
                    <input
                      id="sign-in-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                    />
                    <button className="primary-button" type="submit">
                      Send sign-in link <span>→</span>
                    </button>
                  </form>
                </>
              )}
              {authMessage && <p className="auth-message" role="status">{authMessage}</p>}
              {!isSupabaseConfigured && (
                <p className="auth-setup-note">
                  Sign-in becomes available after a Supabase project is connected.
                </p>
              )}
            </div>
          </section>
        )}

        {/* EXPLORE */}

        {screen === "explore" && (
          <section className="explore-screen">
            <div className="explore-hero">
              <p className="eyebrow">PROJECT NEO</p>

              <h1>
                What are you
                <br />
                curious about?
              </h1>

              <p>
                Discover interesting scenarios, answer them,
                and see how everyone else thinks.
              </p>

              <div className="search-box">
                <span>⌕</span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search scenarios..."
                />
              </div>
            </div>

            <div className="category-row">
              {categories.map((category) => (
                <button
                  key={category}
                  className={
                    selectedCategory === category
                      ? "category-button active"
                      : "category-button"
                  }
                  onClick={() => setSelectedCategory(category)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="scenario-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">EXPLORE</p>
                  <h2>
                    {search
                      ? "Search results"
                      : "Trending scenarios"}
                  </h2>
                </div>

                <span>
                  {filteredScenarios.length} scenarios
                </span>
              </div>

              {filteredScenarios.length === 0 ? (
                <div className="empty-state">
                  <h3>Nothing found yet.</h3>
                  <p>
                    Try a different search or category.
                  </p>
                </div>
              ) : (
                <div className="scenario-grid">
                  {filteredScenarios.map((scenario) => (
                    <button
                      className="scenario-card"
                      key={scenario.id}
                      onClick={() => openScenario(scenario)}
                      type="button"
                    >
                      <div className="scenario-card-top">
                        <span>{scenario.category}</span>

                        {scenario.trending && (
                          <span className="trending">
                            Trending
                          </span>
                        )}
                      </div>

                      <h3>{scenario.title}</h3>
                      <p>{scenario.description}</p>

                      <div className="scenario-card-bottom">
                        <span>
                          {scenario.count.toLocaleString()}{" "}
                          responses
                        </span>
                        <span>→</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}        {/* HOME / SCENARIO */}

        {screen === "home" && (
          <section className="scenario-screen">
            <div className="scenario-container">
              <button
                className="back-button"
                onClick={goExplore}
                type="button"
              >
                ← Back to Explore
              </button>

              <div className="scenario-content">
                <span className="scenario-category">
                  {selectedScenario.category}
                </span>

                <p className="eyebrow">WHAT IF...</p>

                <h1>{selectedScenario.title}</h1>

                <p className="scenario-description">
                  {selectedScenario.description}
                </p>

                <div className="scenario-prompt">
                  <span>?</span>
                  <p>{selectedScenario.prompt}</p>
                </div>

                <button
                  className="primary-button"
                  onClick={startAnswering}
                  type="button"
                >
                  Start answering <span>→</span>
                </button>

                <p className="response-count">
                  {selectedScenario.count.toLocaleString()}{" "}
                  people have answered this.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ANSWER */}

        {screen === "answer" && (
          <section className="answer-screen">
            <div className="answer-container">
              <div className="step-indicator">
                <span className="active">01</span>
                <span>02</span>
                <span>03</span>
              </div>

              <p className="eyebrow">YOUR TURN</p>
              <h1>What would you ask?</h1>

              <p className="answer-intro">
                There are no right answers. That's the point.
              </p>

              <div className="question-list">
                <label>
                  <span>Question 1</span>
                  <input
                    value={questionOne}
                    onChange={(event) =>
                      setQuestionOne(event.target.value)
                    }
                    placeholder="What would you ask first?"
                  />
                </label>

                <label>
                  <span>Question 2</span>
                  <input
                    value={questionTwo}
                    onChange={(event) =>
                      setQuestionTwo(event.target.value)
                    }
                    placeholder="What else would you want to know?"
                  />
                </label>

                <label>
                  <span>Question 3</span>
                  <input
                    value={questionThree}
                    onChange={(event) =>
                      setQuestionThree(event.target.value)
                    }
                    placeholder="What would you ask with your final question?"
                  />
                </label>
              </div>

              <button
                className="primary-button"
                disabled={!canSubmit || isSubmittingAnswers}
                onClick={submitAnswers}
                type="button"
              >
                {isSubmittingAnswers ? "Saving..." : "Reveal community"}
                {!isSubmittingAnswers && <span>→</span>}
              </button>
            </div>
          </section>
        )}

        {/* REVEAL */}

        {screen === "reveal" && (
          <section className="reveal-screen">
            <div className="reveal-container">
              <div className="reveal-orb">
                <div />
              </div>

              <p className="eyebrow">
                YOUR PERSPECTIVE IS IN
              </p>

              <h1>
                Now let's see how
                <br />
                everyone else thinks.
              </h1>

              <p>
                You've answered. The community is waiting.
              </p>

              <div className="reveal-stats">
                <div>
                  <strong>
                    {selectedScenario.count.toLocaleString()}
                  </strong>
                  <span>responses</span>
                </div>

                <div>
                  <strong>7</strong>
                  <span>different perspectives</span>
                </div>
              </div>

              <button
                className="primary-button"
                onClick={() => setScreen("community")}
                type="button"
              >
                Reveal their answers <span>→</span>
              </button>
            </div>
          </section>
        )}

        {/* COMMUNITY */}

        {screen === "community" && (
          <section className="community-screen">
            <div className="community-container">
              <button
                className="back-button"
                onClick={goHome}
                type="button"
              >
                ← Back to scenario
              </button>

              <div className="community-header">
                <p className="eyebrow">THE COMMUNITY</p>

                <h1>
                  So... what did everyone
                  <br />
                  else say?
                </h1>

                <p>
                  Different people. Different answers.
                  Same question.
                </p>
              </div>

              <div className="community-toolbar">
                <span>
                  {selectedScenario.count.toLocaleString()}{" "}
                  responses
                </span>

                <div className="sort-buttons">
                  <button
                    className={sortMode === "liked" ? "active" : ""}
                    onClick={() => setSortMode("liked")}
                    type="button"
                  >
                    Most liked
                  </button>

                  <button
                    className={sortMode === "newest" ? "active" : ""}
                    onClick={() => setSortMode("newest")}
                    type="button"
                  >
                    Newest
                  </button>

                  <button
                    className={
                      sortMode === "unexpected" ? "active" : ""
                    }
                    onClick={() => setSortMode("unexpected")}
                    type="button"
                  >
                    Unexpected
                  </button>
                </div>
              </div>

              <div className="community-list">
                {sortedAnswers.map((answer) => (
                  <article
                    className="community-answer"
                    key={answer.id}
                  >
                    <div className="answer-user">
                      <div className="avatar">
                        {answer.name.charAt(0).toUpperCase()}
                      </div>

                      <strong>{answer.name}</strong>

                      {answer.unexpected && (
                        <span>Unexpected</span>
                      )}
                    </div>

                    <p>{answer.answer}</p>

                    <button
                      className="like-button"
                      onClick={() => toggleLike(answer.id)}
                      type="button"
                    >
                      ♡ {answer.likes}
                    </button>
                  </article>
                ))}
              </div>

              <div className="your-answer-card">
                <span>YOUR ANSWER</span>
                <p>
                  Your perspective has been added to the
                  conversation.
                </p>
              </div>

              <div className="community-actions">
                <button
                  className="primary-button"
                  onClick={nextScenario}
                  type="button"
                >
                  Next scenario <span>→</span>
                </button>

                <button
                  className="secondary-button"
                  onClick={goExplore}
                  type="button"
                >
                  Explore more scenarios
                </button>
              </div>
            </div>
          </section>
        )}        {/* CREATE SCENARIO */}

        {screen === "create" && (
          <section className="create-screen">
            <div className="create-container">
              <div className="create-header">
                <button
                  className="back-button"
                  onClick={goExplore}
                  type="button"
                >
                  ← Back to Explore
                </button>

                <p className="eyebrow">CREATE A SCENARIO</p>

                <h1>
                  Ask something
                  <br />
                  worth answering.
                </h1>

                <p>
                  Great scenarios make people stop, think,
                  and want to know what everyone else would say.
                </p>
              </div>

              <div className="create-layout">
                <div className="create-form">
                  <label>
                    <span>Scenario title</span>
                    <input
                      value={createTitle}
                      onChange={(event) =>
                        setCreateTitle(event.target.value)
                      }
                      placeholder="Give your scenario a name"
                    />
                  </label>

                  <label>
                    <span>What's happening?</span>
                    <textarea
                      value={createDescription}
                      onChange={(event) =>
                        setCreateDescription(event.target.value)
                      }
                      placeholder="Describe the hypothetical situation..."
                      rows={5}
                    />
                  </label>

                  <label>
                    <span>Category</span>
                    <select
                      value={createCategory}
                      onChange={(event) =>
                        setCreateCategory(event.target.value)
                      }
                    >
                      {categories
                        .filter((category) => category !== "All")
                        .map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label>
                    <span>What should people answer?</span>
                    <input
                      value={createPrompt}
                      onChange={(event) =>
                        setCreatePrompt(event.target.value)
                      }
                      placeholder="Ask the question..."
                    />
                  </label>

                  {createError && (
                    <div className="create-message error">
                      {createError}
                    </div>
                  )}

                  {createSuccess && (
                    <div className="create-message success">
                      {createSuccess}
                    </div>
                  )}

                  <div className="create-guideline">
                    <strong>Before you submit</strong>
                    <p>
                      {isSupabaseConfigured
                        ? "Keep it interesting, answerable, and respectful. Submitted scenarios go through community review before they are published."
                        : "Keep it interesting, answerable, and respectful. Your scenario is saved in this browser and is visible only on this device."}
                    </p>
                  </div>

                  <button
                    className="primary-button"
                    disabled={!canCreate || isSubmitting}
                    onClick={submitScenario}
                    type="button"
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : isSupabaseConfigured
                        ? "Submit for review"
                        : "Save on this device"}

                    {!isSubmitting && <span>→</span>}
                  </button>
                </div>

                <div className="scenario-preview">
                  <p className="preview-label">LIVE PREVIEW</p>

                  <div className="preview-card">
                    <div className="preview-top">
                      <span>{createCategory}</span>
                      <span>Preview</span>
                    </div>

                    <p className="eyebrow">WHAT IF...</p>

                    <h2>
                      {createTitle || "Your scenario title"}
                    </h2>

                    <p>
                      {createDescription ||
                        "Your scenario description will appear here as you write it."}
                    </p>

                    <div className="preview-prompt">
                      <span>?</span>
                      <p>
                        {createPrompt ||
                          "Your question will appear here."}
                      </p>
                    </div>
                  </div>

                  <div className="review-note">
                    <strong>{isSupabaseConfigured ? "Community review" : "Saved privately"}</strong>
                    <p>
                      {isSupabaseConfigured
                        ? "New scenarios appear publicly after a moderator approves them."
                        : "Scenarios you create stay in this browser until Project Neo has a shared community backend."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
