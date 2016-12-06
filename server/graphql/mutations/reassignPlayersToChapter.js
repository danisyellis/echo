import {GraphQLNonNull, GraphQLID} from 'graphql'
import {GraphQLList} from 'graphql/type'
import {GraphQLError} from 'graphql/error'

import {connect} from 'src/db'
import {userCan} from 'src/common/util'
import {reassignPlayersToChapter} from 'src/server/db/player'
import {User} from 'src/server/graphql/schemas'

const r = connect()

export default {
  type: new GraphQLList(User),
  args: {
    playerIds: {type: new GraphQLList(GraphQLID)},
    chapterId: {type: new GraphQLNonNull(GraphQLID)},
  },
  async resolve(source, {playerIds, chapterId}, {rootValue: {currentUser}}) {
    if (!userCan(currentUser, 'reassignPlayersToChapter')) {
      throw new GraphQLError('You are not authorized to do that.')
    }

    const chapter = await r.table('chapters').get(chapterId).run()
    if (!chapter) {
      throw new GraphQLError('No such chapter.')
    }

    return await reassignPlayersToChapter(playerIds, chapterId)
      .then(updatedPlayers => updatedPlayers.map(player => Object.assign({}, player, {chapter})))
  }
}
