// Only the platform base class is replaced. Tests execute the real room handlers.
export class DurableObject<Env> {
  constructor(protected ctx: DurableObjectState, protected env: Env) {}
}
