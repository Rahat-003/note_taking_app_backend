import type { PipelineStage } from 'mongoose';

export class UserAggregations {
  private constructor() {}

  /** Scenario 1: users grouped by interest. Must run as a single User.aggregate() call. */
  static usersByInterest(interest: string, skip: number, limit: number): PipelineStage[] {
    const pipeline: PipelineStage[] = [];

    if (interest) {
      // Equality on the multikey { interests: 1 } index -> IXSCAN.
      pipeline.push({ $match: { interests: interest } });
    } else {
      // Sorting on the indexed field lets the planner walk { interests: 1 } (IXSCAN) instead of
      // scanning the collection; it also skips users with no interests, whose key is undefined/[].
      pipeline.push({ $sort: { interests: 1 } });
    }

    pipeline.push({ $project: { name: 1, email: 1, interests: 1 } }, { $unwind: '$interests' });

    if (interest) pipeline.push({ $match: { interests: interest } });

    pipeline.push(
      {
        $group: {
          _id: '$interests',
          count: { $sum: 1 },
          users: { $push: { _id: '$_id', name: '$name', email: '$email' } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }, { $project: { _id: 0, interest: '$_id', count: 1, users: 1 } }],
          total: [{ $count: 'count' }],
        },
      },
    );

    return pipeline;
  }
}
