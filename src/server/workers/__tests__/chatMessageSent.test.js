/* eslint-env mocha */
/* global expect, testContext */
/* eslint-disable prefer-arrow-callback, no-unused-expressions, max-nested-callbacks */
import nock from 'nock'

import stubs from 'src/test/stubs'

describe(testContext(__filename), function () {
  beforeEach(function () {
    stubs.chatService.enable()
  })
  afterEach(function () {
    stubs.chatService.disable()
  })

  describe('processChatMessageSent()', function () {
    const chatService = require('src/server/services/chatService')

    const {processChatMessageSent} = require('../chatMessageSent')

    it('sends a message to the project chatroom', async function () {
      const event = {type: 'channel', target: 'channel1', msg: 'this is the channel message'}
      await processChatMessageSent(event)
      expect(chatService.createChannelMessage).to.have.been.calledWith(event.target, event.msg)
    })

    it('sends a DM to each member', async function () {
      const event = {type: 'users', target: 'steve', msg: 'this is the direct message'}
      await processChatMessageSent(event)
      expect(chatService.createDirectMessage).to.have.been.calledWith(event.target, event.msg)
    })

    it('sends a response', async function () {
      const responseBaseURL = 'http://hooks.example.com'
      const responsePath = '/commands/FOO/BAR'
      const responseURL = `${responseBaseURL}${responsePath}`
      nock(responseBaseURL)
        .post(responsePath)
        .reply(200, {ok: true})
      const event = {type: 'response', target: responseURL, msg: {text: 'this is the response'}}
      await processChatMessageSent(event)
      expect(chatService.createResponseMessage).to.have.been.calledWith(event.target, event.msg)
    })

    it('accepts an array of messages', async function () {
      const event = {type: 'channel', target: 'channel1', msg: ['msg1', 'msg2']}
      await processChatMessageSent(event)
      expect(chatService.createChannelMessage.callCount).to.eq(event.msg.length)
      expect(chatService.createChannelMessage).to.have.been.calledWith(event.target, event.msg[0])
      expect(chatService.createChannelMessage).to.have.been.calledWith(event.target, event.msg[1])
    })
  })
})
