import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CinematicMediaCard } from "../components/CinematicMediaCard";

const card = {
  title: "Example Movie",
  imageUrl: "https://image.tmdb.org/t/p/w500/example.jpg",
  year: "2026",
  mediaLabel: "Movie",
  rating: "8.5",
  overview: "A sample title",
  watched: false,
  saved: false,
  progressPercent: 37,
  onOpen() {},
  onToggleWatchlist() {},
  onToggleWatched() {},
};

test("cinematic media card uses poster artwork with independent accessible controls", () => {
  const html = renderToStaticMarkup(createElement(CinematicMediaCard, card));
  assert.match(html, /aspect-\[2\/3\]/);
  assert.match(html, /aria-label="Open Example Movie details"/);
  assert.match(html, /aria-label="Add Example Movie to Watchlist"/);
  assert.match(html, /aria-label="Mark Example Movie as watched"/);
  assert.equal((html.match(/<button\b/g) || []).length, 3);
  assert.equal(html.split("</button>").length - 1, 3);
  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /data-testid="card-play-progress-bar"/);
});

test("cinematic saved and watched states are explicit and clamp invalid progress", () => {
  const html = renderToStaticMarkup(createElement(CinematicMediaCard, {
    ...card, saved: true, watched: true, progressPercent: 400, recent: true,
  }));
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /aria-valuenow="100"/);
  assert.match(html, /data-testid="recent-release-tag"/);
});

test("missing poster is readable and empty progress is omitted", () => {
  const html = renderToStaticMarkup(createElement(CinematicMediaCard, {
    ...card, imageUrl: null, progressPercent: null,
  }));
  assert.doesNotMatch(html, /<img\b/);
  assert.doesNotMatch(html, /data-testid="card-play-progress-bar"/);
  assert.match(html, /Example Movie/);
});
