export interface SportEngine {
  readonly code: string;

  /**
   * Return the default configuration for the sport, merged with any user-provided config.
   */
  getDefaultConfig(customConfig?: Record<string, any>): Record<string, any>;

  /**
   * Return the initial liveData state when a match is created.
   */
  getInitialLiveData(
    homeTeamId: string,
    awayTeamId: string,
    config?: Record<string, any>,
  ): Record<string, any>;

  /**
   * Calculate automatic player ratings at match completion.
   * Returns an array of players with their updated rating.
   */
  calculatePlayerRatings(
    match: any,
    matchPlayers: any[],
    winnerTeamId: string | null,
    loserTeamId: string | null,
  ): any[];

  /**
   * Aggregate statistics for the sport's competition.
   */
  getCompetitionStats(
    completedMatches: any[],
    allMatchPlayers: any[],
    context: {
      userUserIdMap: Map<string, any>;
      userUsernameMap: Map<string, any>;
    },
  ): Record<string, any>;
}
