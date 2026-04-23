type Reducer<S> = (state: S, payload?: unknown) => S

export function reducerPipeline<S>(...reducers: Reducer<S>[]) {
  return (state: S, payload?: unknown): S =>
    reducers.reduce((s, r) => r(s, payload), state)
}
