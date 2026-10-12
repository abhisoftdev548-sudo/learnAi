import { Search, SlidersHorizontal, Code2, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { challengeService } from "../services/challengeService";
import { useResource, useDebounce } from "../hooks/useResource";
import {
  PageHeader,
  Skeleton,
  ErrorState,
  EmptyState,
  Pagination,
} from "../components/UI";
import ChallengeCard from "../components/ChallengeCard";
import { categories, difficulties } from "../utils/format";
export default function Challenges() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const debounced = useDebounce(search);
  const category = params.get("category") || "",
    difficulty = params.get("difficulty") || "",
    page = Math.max(1, Number(params.get("page")) || 1);
  useEffect(() => {
    setSearch(params.get("search") || "");
  }, [params.get("search")]);
  useEffect(() => {
    if (debounced !== (params.get("search") || ""))
      setParams(
        (old) => {
          const next = new URLSearchParams(old);
          if (debounced) next.set("search", debounced);
          else next.delete("search");
          next.delete("page");
          return next;
        },
        { replace: true },
      );
  }, [debounced]);
  const change = (key, value) =>
    setParams((old) => {
      const next = new URLSearchParams(old);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  const resource = useResource(
    (signal) =>
      challengeService.list(
        {
          page,
          limit: 12,
          category,
          difficulty,
          search: params.get("search") || "",
        },
        signal,
      ),
    [page, category, difficulty, params.get("search")],
  );
  return (
    <>
      <PageHeader
        eyebrow="A LITTLE PRACTICE GOES A LONG WAY"
        title="Build something. Learn something."
        description="Hands-on challenges to turn your frontend knowledge into real skills."
      />
      <div className="challenge-banner">
        <span className="challenge-banner-icon">
          <Code2 size={23} />
        </span>
        <div>
          <strong>Your playground for progress.</strong>
          <span>Choose a challenge, open your editor, and make it yours.</span>
        </div>
        <span className="challenge-banner-tag">HTML · CSS · JavaScript</span>
      </div>
      <div className="challenge-toolbar">
        <div className="tabs category-tabs" aria-label="Filter category">
          {["All challenges", ...categories].map((cat, i) => (
            <button
              key={cat}
              className={category === (i ? cat : "") ? "active" : ""}
              onClick={() => change("category", i ? cat : "")}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="filter-controls">
          <div className="search-input">
            <Search size={16} />
            <input
              aria-label="Search challenge titles"
              placeholder="Find your next challenge…"
              maxLength={100}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="select-wrap">
            <SlidersHorizontal size={15} />
            <select
              aria-label="Filter difficulty"
              value={difficulty}
              onChange={(e) => change("difficulty", e.target.value)}
            >
              <option value="">All levels</option>
              {difficulties.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {resource.loading ? (
        <div className="challenge-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton rows={2} key={i} />
          ))}
        </div>
      ) : resource.error ? (
        <ErrorState error={resource.error} retry={resource.reload} />
      ) : (
        <>
          {resource.data.total > 0 ? (
            <>
              <div className="results-summary">
                <span>{resource.data.total} challenges to explore</span>
                <span>Find your focus. Make your next move.</span>
              </div>
              <div className="challenge-grid">
                {resource.data.items.map((challenge) => (
                  <ChallengeCard key={challenge._id} challenge={challenge} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="No challenges found"
              description={
                search || category || difficulty
                  ? "Try another search or loosen your filters."
                  : "Your team admin hasn’t published any challenges yet."
              }
            />
          )}
          <Pagination
            page={page}
            limit={12}
            total={resource.data.total}
            onChange={(p) => change("page", p)}
          />
        </>
      )}
    </>
  );
}
