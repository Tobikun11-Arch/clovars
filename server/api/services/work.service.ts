import {clientRepository} from '../repositories/client.repository';
import {projectRepository} from '../repositories/project.repository';
import {taskRepository} from '../repositories/task.repository';
import {tagRepository} from '../repositories/tag.repository';
import {ApiError} from '../utils/error';
import {ErrorCodes} from '../constants/errorCodes';
import type {ClientDocument} from '../models/Client.model';
import type {ProjectDocument} from '../models/Project.model';
import type {TaskDocument} from '../models/Task.model';
import type {TagDocument} from '../models/Tag.model';

const DEFAULT_TAG_COLOR = '#4fc3f7';

function toClientDto(client: ClientDocument) {
  return {
    id: client.id,
    workspaceId: client.workspaceId,
    name: client.name,
    notes: client.notes ?? null,
    color: client.color ?? null,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt
  };
}

function toProjectDto(project: ProjectDocument) {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    clientId: project.clientId ?? null,
    name: project.name,
    color: project.color ?? null,
    archived: project.archived,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

function toTaskDto(task: TaskDocument) {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    name: task.name,
    description: task.description ?? null,
    archived: task.archived,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };
}

function toTagDto(tag: TagDocument) {
  return {
    id: tag.id,
    workspaceId: tag.workspaceId,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt
  };
}

export const clientService = {
  async list(workspaceId: string) {
    const clients = await clientRepository.findByWorkspace(workspaceId);
    return clients.map(toClientDto);
  },

  async get(workspaceId: string, clientId: string) {
    const client = await clientRepository.findByIdInWorkspace(
      clientId,
      workspaceId
    );

    if (!client) {
      throw new ApiError(
        404,
        ErrorCodes.CLIENT_NOT_FOUND,
        'Client not found in this workspace'
      );
    }

    return toClientDto(client);
  },

  async create(
    workspaceId: string,
    actorId: string,
    data: {name: string; notes?: string | null; color?: string | null}
  ) {
    const existing = await clientRepository.findByNameInWorkspace(
      workspaceId,
      data.name
    );

    if (existing) {
      throw new ApiError(
        409,
        ErrorCodes.CLIENT_NAME_TAKEN,
        'A client with that name already exists in this workspace'
      );
    }

    const client = await clientRepository.create({
      workspaceId,
      name: data.name,
      notes: data.notes ?? null,
      color: data.color ?? null,
      createdBy: actorId
    });

    return toClientDto(client);
  },

  async update(
    workspaceId: string,
    clientId: string,
    data: {name?: string; notes?: string | null; color?: string | null}
  ) {
    const client = await clientRepository.findByIdInWorkspace(
      clientId,
      workspaceId
    );

    if (!client) {
      throw new ApiError(
        404,
        ErrorCodes.CLIENT_NOT_FOUND,
        'Client not found in this workspace'
      );
    }

    if (data.name && data.name !== client.name) {
      const duplicate = await clientRepository.findByNameInWorkspace(
        workspaceId,
        data.name
      );

      if (duplicate && duplicate.id !== clientId) {
        throw new ApiError(
          409,
          ErrorCodes.CLIENT_NAME_TAKEN,
          'A client with that name already exists in this workspace'
        );
      }
    }

    await clientRepository.update(clientId, data);

    return {...toClientDto(client), ...data};
  },

  async remove(workspaceId: string, clientId: string): Promise<void> {
    const client = await clientRepository.findByIdInWorkspace(
      clientId,
      workspaceId
    );

    if (!client) {
      throw new ApiError(
        404,
        ErrorCodes.CLIENT_NOT_FOUND,
        'Client not found in this workspace'
      );
    }

    // Keep projects, but detach them from the deleted client
    await projectRepository.clearClient(clientId);
    await clientRepository.delete(clientId);
  }
};

export const projectService = {
  async list(workspaceId: string, clientId?: string) {
    const projects = await projectRepository.findByWorkspace(
      workspaceId,
      clientId
    );
    return projects.map(toProjectDto);
  },

  async get(workspaceId: string, projectId: string) {
    const project = await projectRepository.findByIdInWorkspace(
      projectId,
      workspaceId
    );

    if (!project) {
      throw new ApiError(
        404,
        ErrorCodes.PROJECT_NOT_FOUND,
        'Project not found in this workspace'
      );
    }

    return toProjectDto(project);
  },

  async create(
    workspaceId: string,
    actorId: string,
    data: {
      name: string;
      clientId?: string | null;
      color?: string | null;
      archived?: boolean;
    }
  ) {
    if (data.clientId) {
      const client = await clientRepository.findByIdInWorkspace(
        data.clientId,
        workspaceId
      );

      if (!client) {
        throw new ApiError(
          404,
          ErrorCodes.CLIENT_NOT_FOUND,
          'Client not found in this workspace'
        );
      }
    }

    const existing = await projectRepository.findByNameInWorkspace(
      workspaceId,
      data.name
    );

    if (existing) {
      throw new ApiError(
        409,
        ErrorCodes.PROJECT_NAME_TAKEN,
        'A project with that name already exists in this workspace'
      );
    }

    const project = await projectRepository.create({
      workspaceId,
      clientId: data.clientId ?? null,
      name: data.name,
      color: data.color ?? null,
      archived: data.archived ?? false,
      createdBy: actorId
    });

    return toProjectDto(project);
  },

  async update(
    workspaceId: string,
    projectId: string,
    data: {
      name?: string;
      clientId?: string | null;
      color?: string | null;
      archived?: boolean;
    }
  ) {
    const project = await projectRepository.findByIdInWorkspace(
      projectId,
      workspaceId
    );

    if (!project) {
      throw new ApiError(
        404,
        ErrorCodes.PROJECT_NOT_FOUND,
        'Project not found in this workspace'
      );
    }

    if (data.clientId) {
      const client = await clientRepository.findByIdInWorkspace(
        data.clientId,
        workspaceId
      );

      if (!client) {
        throw new ApiError(
          404,
          ErrorCodes.CLIENT_NOT_FOUND,
          'Client not found in this workspace'
        );
      }
    }

    if (data.name && data.name !== project.name) {
      const duplicate = await projectRepository.findByNameInWorkspace(
        workspaceId,
        data.name
      );

      if (duplicate && duplicate.id !== projectId) {
        throw new ApiError(
          409,
          ErrorCodes.PROJECT_NAME_TAKEN,
          'A project with that name already exists in this workspace'
        );
      }
    }

    await projectRepository.update(projectId, data);

    return {...toProjectDto(project), ...data};
  },

  async remove(workspaceId: string, projectId: string): Promise<void> {
    const project = await projectRepository.findByIdInWorkspace(
      projectId,
      workspaceId
    );

    if (!project) {
      throw new ApiError(
        404,
        ErrorCodes.PROJECT_NOT_FOUND,
        'Project not found in this workspace'
      );
    }

    // Tasks belong to a project, so remove them together with the project
    await taskRepository.deleteByProject(projectId);
    await projectRepository.delete(projectId);
  }
};

export const taskService = {
  async list(workspaceId: string, projectId?: string) {
    const tasks = await taskRepository.findByWorkspace(workspaceId, projectId);
    return tasks.map(toTaskDto);
  },

  async get(workspaceId: string, taskId: string) {
    const task = await taskRepository.findByIdInWorkspace(taskId, workspaceId);

    if (!task) {
      throw new ApiError(
        404,
        ErrorCodes.TASK_NOT_FOUND,
        'Task not found in this workspace'
      );
    }

    return toTaskDto(task);
  },

  async create(
    workspaceId: string,
    actorId: string,
    data: {
      name: string;
      projectId: string;
      description?: string | null;
      archived?: boolean;
    }
  ) {
    const project = await projectRepository.findByIdInWorkspace(
      data.projectId,
      workspaceId
    );

    if (!project) {
      throw new ApiError(
        404,
        ErrorCodes.PROJECT_NOT_FOUND,
        'Project not found in this workspace'
      );
    }

    const existing = await taskRepository.findByNameInProject(
      workspaceId,
      data.projectId,
      data.name
    );

    if (existing) {
      throw new ApiError(
        409,
        ErrorCodes.TASK_NAME_TAKEN,
        'A task with that name already exists in this project'
      );
    }

    const task = await taskRepository.create({
      workspaceId,
      projectId: data.projectId,
      name: data.name,
      description: data.description ?? null,
      archived: data.archived ?? false,
      createdBy: actorId
    });

    return toTaskDto(task);
  },

  async update(
    workspaceId: string,
    taskId: string,
    data: {
      name?: string;
      projectId?: string;
      description?: string | null;
      archived?: boolean;
    }
  ) {
    const task = await taskRepository.findByIdInWorkspace(taskId, workspaceId);

    if (!task) {
      throw new ApiError(
        404,
        ErrorCodes.TASK_NOT_FOUND,
        'Task not found in this workspace'
      );
    }

    const targetProjectId = data.projectId ?? task.projectId;

    if (data.projectId && data.projectId !== task.projectId) {
      const project = await projectRepository.findByIdInWorkspace(
        data.projectId,
        workspaceId
      );

      if (!project) {
        throw new ApiError(
          404,
          ErrorCodes.PROJECT_NOT_FOUND,
          'Project not found in this workspace'
        );
      }
    }

    const targetName = data.name ?? task.name;

    if (
      targetName !== task.name ||
      targetProjectId !== task.projectId
    ) {
      const duplicate = await taskRepository.findByNameInProject(
        workspaceId,
        targetProjectId,
        targetName
      );

      if (duplicate && duplicate.id !== taskId) {
        throw new ApiError(
          409,
          ErrorCodes.TASK_NAME_TAKEN,
          'A task with that name already exists in this project'
        );
      }
    }

    await taskRepository.update(taskId, data);

    return {...toTaskDto(task), ...data};
  },

  async remove(workspaceId: string, taskId: string): Promise<void> {
    const task = await taskRepository.findByIdInWorkspace(taskId, workspaceId);

    if (!task) {
      throw new ApiError(
        404,
        ErrorCodes.TASK_NOT_FOUND,
        'Task not found in this workspace'
      );
    }

    await taskRepository.delete(taskId);
  }
};

export const tagService = {
  async list(workspaceId: string) {
    const tags = await tagRepository.findByWorkspace(workspaceId);
    return tags.map(toTagDto);
  },

  async create(
    workspaceId: string,
    actorId: string,
    data: {name: string; color?: string | null}
  ) {
    const existing = await tagRepository.findByNameInWorkspace(
      workspaceId,
      data.name
    );

    if (existing) {
      throw new ApiError(
        409,
        ErrorCodes.TAG_NAME_TAKEN,
        'A tag with that name already exists in this workspace'
      );
    }

    const tag = await tagRepository.create({
      workspaceId,
      name: data.name,
      color: data.color ?? DEFAULT_TAG_COLOR,
      createdBy: actorId
    });

    return toTagDto(tag);
  },

  async update(
    workspaceId: string,
    tagId: string,
    data: {name?: string; color?: string}
  ) {
    const tag = await tagRepository.findByIdInWorkspace(tagId, workspaceId);

    if (!tag) {
      throw new ApiError(
        404,
        ErrorCodes.TAG_NOT_FOUND,
        'Tag not found in this workspace'
      );
    }

    if (data.name && data.name !== tag.name) {
      const duplicate = await tagRepository.findByNameInWorkspace(
        workspaceId,
        data.name
      );

      if (duplicate && duplicate.id !== tagId) {
        throw new ApiError(
          409,
          ErrorCodes.TAG_NAME_TAKEN,
          'A tag with that name already exists in this workspace'
        );
      }
    }

    await tagRepository.update(tagId, data);

    return {...toTagDto(tag), ...data};
  },

  async remove(workspaceId: string, tagId: string): Promise<void> {
    const tag = await tagRepository.findByIdInWorkspace(tagId, workspaceId);

    if (!tag) {
      throw new ApiError(
        404,
        ErrorCodes.TAG_NOT_FOUND,
        'Tag not found in this workspace'
      );
    }

    await tagRepository.delete(tagId);
  }
};
