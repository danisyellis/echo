import {MIN_TEAM_SIZE} from '../pool'

export default function createTeamSizes(recTeamSize, numRegularPlayers, numAdvancedPlayers) {
  const needsAdvancedPlayer = numAdvancedPlayers !== 0
  const advancedPlayersPerTeam = needsAdvancedPlayer ? 1 : 0
  const numPerfectRegularPlayers = recTeamSize - advancedPlayersPerTeam
  const numPerfectTeams = Math.floor(numRegularPlayers / numPerfectRegularPlayers)

  // form as many perfect teams as possible
  const teamSizes = new Array(numPerfectTeams).fill(null)
    .map(() => ({regular: numPerfectRegularPlayers, advanced: advancedPlayersPerTeam}))

  // any regular or advanced players "left over"?
  const remainingRegularPlayers = (numRegularPlayers % numPerfectRegularPlayers) || 0
  const remainingAdvancedPlayers = Math.max(numAdvancedPlayers - teamSizes.length, 0)
  const totalRemaining = remainingRegularPlayers + remainingAdvancedPlayers
  const maxRemaining = remainingAdvancedPlayers ? totalRemaining : (remainingRegularPlayers + advancedPlayersPerTeam)

  if (totalRemaining) {
    const remainingTeamSize = {regular: remainingRegularPlayers, advanced: remainingAdvancedPlayers}
    const minTeamSize = Math.max(MIN_TEAM_SIZE, recTeamSize - 1)
    const maxTeamSize = recTeamSize + 1

    if (maxRemaining >= minTeamSize && maxRemaining <= maxTeamSize) {
      if (!remainingAdvancedPlayers) {
        remainingTeamSize.advanced = advancedPlayersPerTeam
      }
      teamSizes.push(remainingTeamSize)
    } else if (totalRemaining <= teamSizes.length) {
      // teams can be rec size + 1, and there are few enough remaining spots that
      // we can add each of them to an existing (previously "perfect-sized") team
      let i = 0
      for (; i < remainingRegularPlayers; i++) {
        teamSizes[i].regular++
      }
      for (let j = 0; j < remainingAdvancedPlayers; i++, j++) {
        teamSizes[j].advanced++
      }
    } else if ((minTeamSize - maxRemaining) <= teamSizes.length) {
      // teams can be rec size - 1, and there are enough "perfect-sized" teams
      // that we can take 1 spot from the regular players of some them and
      // add those to the leftover spots to make 1 more team
      if (!remainingTeamSize.advanced) {
        remainingTeamSize.advanced = advancedPlayersPerTeam
      }
      for (let i = 0; (remainingTeamSize.regular + remainingTeamSize.advanced) < minTeamSize; i++) {
        teamSizes[i].regular--
        remainingTeamSize.regular++
      }
      teamSizes.push(remainingTeamSize)
    } else {
      // make a team out of the remaining spots anyway
      // TODO: throw an error? toss the entire goal group? do something better.
      teamSizes.push(remainingTeamSize)
    }
  }

  return teamSizes
}
