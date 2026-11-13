export const BROWSE_MEDIA_FIELDS = `
  id
  type
  title { romaji english native }
  coverImage { large extraLarge color }
  bannerImage
  description(asHtml: false)
  genres
  isAdult
  tags { name isAdult }
  averageScore
  popularity
  episodes
  status
  format
  source
  season
  seasonYear
  startDate { year month day }
  studios(isMain: true) {
    nodes {
      id
      name
      isAnimationStudio
    }
  }
`;

export const BROWSE_QUERY = `
query (
  $page: Int,
  $perPage: Int,
  $search: String,
  $genre_in: [String],
  $season: MediaSeason,
  $seasonYear: Int,
  $format: MediaFormat,
  $source: MediaSource,
  $sort: [MediaSort],
  $isAdult: Boolean
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(
      search: $search,
      genre_in: $genre_in,
      season: $season,
      seasonYear: $seasonYear,
      format: $format,
      source: $source,
      type: ANIME,
      isAdult: $isAdult,
      sort: $sort
    ) {
      ${BROWSE_MEDIA_FIELDS}
    }
  }
}`;

export const STUDIO_BROWSE_QUERY = `
query ($studio: String, $page: Int, $perPage: Int, $sort: [MediaSort]) {
  Studio(search: $studio) {
    id
    name
    media(isMain: true, sort: $sort, page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage }
      nodes {
        ${BROWSE_MEDIA_FIELDS}
      }
    }
  }
}`;

export const DETAIL_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    coverImage { extraLarge large color }
    bannerImage
    description(asHtml: false)
    genres
    isAdult
    tags { name isAdult }
    averageScore
    meanScore
    popularity
    episodes
    status
    format
    source
    season
    seasonYear
    startDate { year month day }
    studios(isMain: true) {
      nodes {
        id
        name
        isAnimationStudio
      }
    }
    trailer { id site thumbnail }
    streamingEpisodes { title thumbnail url site }
    relations {
      edges {
        relationType
        node {
          id
          type
          title { romaji english }
          isAdult
          genres
          tags { name isAdult }
          episodes
          format
          season
          seasonYear
          startDate { year month day }
          coverImage { large }
        }
      }
    }
    characters(sort: [ROLE, RELEVANCE], perPage: 8) {
      edges {
        role
        node { id name { full } image { large } }
      }
    }
    recommendations(perPage: 8, sort: [RATING_DESC]) {
      nodes {
        mediaRecommendation {
          ${BROWSE_MEDIA_FIELDS}
        }
      }
    }
  }
}`;

