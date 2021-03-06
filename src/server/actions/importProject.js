import logger from 'src/server/util/logger'
import findUsers from 'src/server/actions/findUsers'
import getChapter from 'src/server/actions/getChapter'
import saveProject from 'src/server/actions/saveProject'
import {Phase, getCycleForChapter, getProject} from 'src/server/services/dataService'
import {LGBadRequestError} from 'src/server/util/error'

export default async function importProject(data = {}) {
  const {chapter, cycle, project, members, phase} = await _parseProjectInput(data)

  const projectValues = {
    chapterId: chapter.id,
    cycleId: cycle.id,
    phaseId: phase.id,
    memberIds: members.map(p => p.id),
  }
  if (project) {
    projectValues.id = project.id
  } else {
    projectValues.name = data.projectIdentifier
  }

  const savedProject = await saveProject(projectValues)

  logger.log(`Project imported: #${savedProject.name} (${savedProject.id})`)

  return savedProject
}

async function _parseProjectInput(data) {
  const {
    projectIdentifier,
    chapterIdentifier,
    cycleIdentifier,
    memberIdentifiers = [],
  } = data || {}

  const [members, chapter] = await Promise.all([
    _validateMembers(memberIdentifiers),
    _validateChapter(chapterIdentifier),
  ])

  const cycle = await _validateCycle(cycleIdentifier, {chapter})
  const phase = await _validatePhase(members[0].phaseId)
  const project = await _validateProject(projectIdentifier, {chapter, cycle})

  return {chapter, cycle, project, members, phase}
}

async function _validateMembers(userIdentifiers = []) {
  if (!Array.isArray(userIdentifiers) || userIdentifiers.length === 0) {
    throw new LGBadRequestError('Must specify at least one project member')
  }

  const userOptions = {idmFields: ['id', 'handle']}
  const memberUsers = userIdentifiers.length > 0 ? await findUsers(userIdentifiers, userOptions) : []

  const memberPhaseIds = new Map()
  const members = userIdentifiers.map(userIdentifier => {
    const memberUser = memberUsers.find(u => (u.handle === userIdentifier || u.id === userIdentifier))
    if (!memberUser) {
      throw new LGBadRequestError(`Users not found for identifier ${userIdentifier}`)
    }
    if (!memberUser.phaseId) {
      throw new LGBadRequestError(`All project members must be in a phase. User ${memberUser.handle} is not assigned to any phase.`)
    }
    memberPhaseIds.set(memberUser.phaseId, true)
    return memberUser
  })

  if (memberPhaseIds.size > 1) {
    throw new LGBadRequestError('Project members must be in the same phase.')
  }

  return members
}

async function _validateChapter(chapterIdentifier) {
  if (!chapterIdentifier) {
    throw new LGBadRequestError('Must specify a chapter')
  }
  const chapter = await getChapter(chapterIdentifier)
  if (!chapter) {
    throw new LGBadRequestError(`Chapter not found for identifier ${chapterIdentifier}`)
  }
  return chapter
}

async function _validateCycle(cycleIdentifier, {chapter}) {
  if (!cycleIdentifier) {
    throw new LGBadRequestError('Must specify a cycle')
  }
  const cycle = await getCycleForChapter(chapter.id, cycleIdentifier)
  if (!cycle) {
    throw new LGBadRequestError(`Cycle not found for identifier ${cycleIdentifier} in chapter ${chapter.name}`)
  }
  if (cycle.chapterId !== chapter.id) {
    throw new LGBadRequestError(`Cycle ${cycleIdentifier} chapter ID ${cycle.chapterId} does not match chapter ${chapter.name} ID ${chapter.id}`)
  }
  return cycle
}

async function _validatePhase(phaseId) {
  return Phase.get(phaseId)
}

async function _validateProject(projectIdentifier, {chapter, cycle}) {
  let project
  if (projectIdentifier) {
    project = await getProject(projectIdentifier)
    if (project) {
      if (project.chapterId !== chapter.id) {
        throw new LGBadRequestError(`Project ${project.name} chapter ID (${project.chapterId}) does not match chapter ${chapter.name} ID (${chapter.id})`)
      }
      if (project.cycleId !== cycle.id) {
        throw new LGBadRequestError(`Project ${project.name} cycle ID (${project.cycleId}) does not match cycle ${cycle.cycleNumber} ID (${cycle.id})`)
      }
    }
  }
  return project
}
