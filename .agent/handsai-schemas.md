# HandsAI Client — Data Schemas: Objective & Task

## Contexto

Estas entidades viven en el **cliente** (fork de LibreChat), del lado del orquestador. No son MCP — tienen acceso directo al loop del modelo y al scheduler. HandsAI Server (MCP) puede escribir en memoria solo cuando el LLM lo invoca; estas entidades en cambio pueden **despertar al agente** de forma autónoma.

---

## Objetivo (`Objective`)

Un objetivo es un norte de largo plazo definido por el usuario. No tiene criterio de completitud automático — solo el usuario lo cierra. El agente lo usa como contexto para decidir qué hacer en cada ciclo del Runner.

### Schema Mongoose

```typescript
// packages/data-schemas/src/schema/objective.ts

import { Schema, model, Document, Types } from 'mongoose';

export interface IObjective extends Document {
  userId: Types.ObjectId;          // dueño del objetivo
  title: string;                   // ej: "Promover HandsAI en marzo"
  description: string;             // detalle libre para el agente
  status: 'active' | 'paused' | 'closed';
  
  // Configuración del Runner
  runner: {
    enabled: boolean;
    cronExpression: string;        // ej: "0 */6 * * *" (cada 6hs)
    lastRunAt?: Date;
    nextRunAt?: Date;
  };

  // Contexto para el agente
  memoryKeys: string[];            // keys de HandsAI memory relevantes
  tools: string[];                 // tools MCP permitidas para este objetivo
  
  // Resultado acumulado
  summary?: string;                // resumen generado por el agente del progreso
  tasksGenerated: number;          // cuántas tareas generó hasta ahora

  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

const ObjectiveSchema = new Schema<IObjective>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'paused', 'closed'],
      default: 'active',
      index: true,
    },
    runner: {
      enabled: { type: Boolean, default: true },
      cronExpression: { type: String, default: '0 */6 * * *' },
      lastRunAt: Date,
      nextRunAt: Date,
    },
    memoryKeys: [{ type: String }],
    tools: [{ type: String }],
    summary: String,
    tasksGenerated: { type: Number, default: 0 },
    closedAt: Date,
  },
  { timestamps: true }
);

export const Objective = model<IObjective>('Objective', ObjectiveSchema);
```

---

## Tarea (`Task`)

Una tarea es una unidad de trabajo acotada con criterio de completitud claro. Puede ser creada por el usuario o **generada por el agente** como consecuencia de evaluar un objetivo. El agente la marca como `done` cuando la cumplió.

### Schema Mongoose

```typescript
// packages/data-schemas/src/schema/task.ts

import { Schema, model, Document, Types } from 'mongoose';

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
export type TaskOrigin = 'user' | 'agent';

export interface ITask extends Document {
  userId: Types.ObjectId;
  objectiveId?: Types.ObjectId;    // opcional — puede existir sin objetivo
  
  title: string;                   // ej: "Chequear si Jules terminó PR #42"
  description: string;
  origin: TaskOrigin;              // quién la creó
  status: TaskStatus;

  // Scheduling
  schedule?: {
    runAt?: Date;                  // ejecución puntual
    cronExpression?: string;       // ejecución recurrente
    lastRunAt?: Date;
    nextRunAt?: Date;
    maxRuns?: number;              // límite de ejecuciones (null = infinito)
    runCount: number;
  };

  // Contexto de ejecución
  context?: string;                // prompt/contexto extra para el agente
  tools: string[];                 // tools MCP permitidas
  memoryKeys: string[];            // keys de memoria relevantes

  // Resultado
  result?: {
    summary: string;               // resumen de lo que hizo el agente
    completedAt: Date;
    durationMs: number;
    toolsUsed: string[];
  };

  // Error (si falló)
  error?: {
    message: string;
    failedAt: Date;
    retryCount: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    objectiveId: { type: Schema.Types.ObjectId, ref: 'Objective', index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    origin: { type: String, enum: ['user', 'agent'], required: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'done', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    schedule: {
      runAt: Date,
      cronExpression: String,
      lastRunAt: Date,
      nextRunAt: Date,
      maxRuns: Number,
      runCount: { type: Number, default: 0 },
    },
    context: String,
    tools: [{ type: String }],
    memoryKeys: [{ type: String }],
    result: {
      summary: String,
      completedAt: Date,
      durationMs: Number,
      toolsUsed: [String],
    },
    error: {
      message: String,
      failedAt: Date,
      retryCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Índice compuesto para el Runner: buscar tareas pendientes por usuario
TaskSchema.index({ userId: 1, status: 1, 'schedule.nextRunAt': 1 });

export const Task = model<ITask>('Task', TaskSchema);
```

---

## Relación entre entidades

```
User
 ├── Objective (1..N)
 │    ├── status: active → Runner la procesa cada ciclo
 │    └── Task (0..N) generadas por el agente
 │
 └── Task (1..N) creadas directamente por el usuario
      └── puede o no tener objectiveId
```

---

## Flujo de estados

### Objetivo
```
active ──(usuario pausa)──→ paused ──(usuario reactiva)──→ active
active ──(usuario cierra)──→ closed
```

### Tarea
```
pending ──(Runner la toma)──→ running ──(agente termina)──→ done
                                       ──(error)──────────→ failed
pending ──(usuario cancela)──→ cancelled
failed  ──(retry)──────────→ running
```

---

## Queries clave del Runner

```typescript
// Objetivos activos con runner habilitado y vencidos
Objective.find({
  status: 'active',
  'runner.enabled': true,
  'runner.nextRunAt': { $lte: new Date() },
});

// Tareas pendientes listas para ejecutar
Task.find({
  status: 'pending',
  $or: [
    { 'schedule.runAt': { $lte: new Date() } },
    { 'schedule.nextRunAt': { $lte: new Date() } },
  ],
});
```

---

## Próximo paso: Agent Runner

Con estos schemas definidos, el Runner tiene todo lo que necesita:
1. Leer objetivos activos vencidos → generar/ejecutar tareas
2. Leer tareas pendientes vencidas → ejecutar directamente
3. Actualizar estado y memoria al terminar
4. Calcular `nextRunAt` para el próximo ciclo
