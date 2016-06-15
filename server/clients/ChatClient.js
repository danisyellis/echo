import fetch from 'isomorphic-fetch'

if (!process.env.CHAT_BASE_URL) {
  throw new Error('CHAT_BASE_URL must be set in environment')
}
const chatBaseUrl = process.env.CHAT_BASE_URL

export default class ChatClient {
  login() {
    return this._fetchFromChat('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `user=echo&password=${process.env.CHAT_API_USER_SECRET}`,
    })
    .then(json => {
      return json.data
    })
  }

  sendMessage(channel, msg) {
    return this._loginAndFetchFromChat(`/api/lg/rooms/${channel}/send`, {
      method: 'POST',
      body: JSON.stringify({msg})
    })
    .then(json => json.result)
  }

  createChannel(channelName, members = ['bundacia', 'echo']) {
    return this._loginAndFetchFromChat('/api/bulk/createRoom', {
      method: 'POST',
      body: JSON.stringify({
        rooms: [
          {name: channelName, members},
        ],
      })
    })
    .then(json => json.ids)
  }

  deleteChannel(channelName) {
    return this._loginAndFetchFromChat(`/api/lg/rooms/${channelName}`, {
      method: 'DELETE',
    }).then(json => json.hasOwnProperty('result')) // return true on success
  }

  _fetchFromChat(path, options) {
    const url = `${chatBaseUrl}${path}`
    return fetch(url, options)
      .then(resp => {
        if (!resp.ok) {
          return Promise.reject(resp.json())
        }
        return resp.json()
      })
      .then(json => {
        if (json.status !== 'success') {
          return Promise.reject(json)
        }
        return json
      })
      .catch(error => Promise.reject(error))
  }

  _loginAndFetchFromChat(path, options) {
    return this.authHeaders()
      .then(authHeaders => {
        const headers = Object.assign({}, authHeaders, {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        })
        const optionsWithHeaders = Object.assign({}, options, {headers})
        return this._fetchFromChat(path, optionsWithHeaders)
      })
  }

  authHeaders() {
    // TODO: cache these headers for a few seconds
    return this.login().then(r => {
      return {
        'X-User-Id': r.userId,
        'X-Auth-Token': r.authToken,
      }
    })
  }
}
