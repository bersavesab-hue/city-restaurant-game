'use strict';

const {
  ISSUE_WEIGHTS
} =
  require('../data/rules.js');

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function contextFactor(
  persona,
  issue
) {
  let factor =
    1;

  if (
    issue.dimension ===
      'typography' ||
    issue.dimension ===
      'interaction' ||
    issue.dimension ===
      'ui'
  ) {
    if (
      persona.device ===
        'small_android' ||
      persona.device ===
        'low_android'
    ) {
      factor *=
        1.16;
    }

    if (
      persona.device ===
        'tablet'
    ) {
      factor *=
        0.92;
    }
  }

  if (
    issue.dimension ===
      'performance' ||
    issue.dimension ===
      'stability'
  ) {
    if (
      persona.device ===
        'low_android'
    ) {
      factor *=
        1.28;
    }
  }

  if (
    issue.dimension ===
      'onboarding' &&
    persona.skill <
      0.35
  ) {
    factor *=
      1.22;
  }

  if (
    (
      issue.dimension ===
        'economy' ||
      issue.dimension ===
        'balance'
    ) &&
    persona.skill >
      0.82
  ) {
    factor *=
      1.14;
  }

  if (
    issue.dimension ===
      'ads' &&
    persona.platform ===
      'douyin'
  ) {
    factor *=
      1.12;
  }

  if (
    (
      issue.dimension ===
        'content' ||
      issue.dimension ===
        'replayability'
    ) &&
    persona.sessionMinutes >=
      60
  ) {
    factor *=
      1.18;
  }

  if (
    issue.dimension ===
      'customization' &&
    (
      persona.archetype ===
        'decorator' ||
      persona.archetype ===
        'sandbox_builder'
    )
  ) {
    factor *=
      1.22;
  }

  return factor;
}

function evaluatePersona(
  persona,
  issues
) {
  const complaints = [];

  for (
    const issue of
    issues
  ) {
    const sensitivity =
      persona
        .sensitivities[
          issue.dimension
        ] ||
      0.55;

    const weight =
      ISSUE_WEIGHTS[
        issue.priority
      ] ||
      1;

    const score =
      clamp(
        weight *
          sensitivity *
          contextFactor(
            persona,
            issue
          ) *
          20,
        0,
        100
      );

    if (
      score >=
      38
    ) {
      complaints.push({
        issueId:
          issue.id,
        priority:
          issue.priority,
        dimension:
          issue.dimension,
        score:
          Math.round(
            score
          ),
        title:
          issue.title
      });
    }
  }

  complaints.sort(
    (
      a,
      b
    ) =>
      b.score -
      a.score
  );

  const topScore =
    complaints.length
      ? complaints[0].score
      : 0;

  const averageTop =
    complaints
      .slice(
        0,
        5
      )
      .reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.score,
        0
      ) /
    Math.max(
      1,
      Math.min(
        5,
        complaints.length
      )
    );

  let churnRisk =
    '低';

  if (
    topScore >=
      88 ||
    averageTop >=
      80
  ) {
    churnRisk =
      '极高';
  } else if (
    topScore >=
      76 ||
    averageTop >=
      68
  ) {
    churnRisk =
      '高';
  } else if (
    topScore >=
      62 ||
    averageTop >=
      56
  ) {
    churnRisk =
      '中';
  }

  return {
    personaId:
      persona.id,
    nickname:
      persona.nickname,
    label:
      persona.label,
    platform:
      persona.platform,
    device:
      persona.device,
    churnRisk,
    complaints
  };
}

function aggregate(
  personas,
  issues
) {
  const results =
    personas.map(
      persona =>
        evaluatePersona(
          persona,
          issues
        )
    );

  const issueMap =
    new Map();

  for (
    const issue of
    issues
  ) {
    issueMap.set(
      issue.id,
      {
        ...issue,
        affected:
          0,
        highConcern:
          0,
        totalScore:
          0,
        platforms: {
          douyin:
            0,
          taptap:
            0,
          cross:
            0
        },
        examples:
          []
      }
    );
  }

  for (
    const result of
    results
  ) {
    for (
      const complaint of
      result.complaints
    ) {
      const item =
        issueMap.get(
          complaint.issueId
        );

      if (!item) {
        continue;
      }

      item.affected +=
        1;

      item.totalScore +=
        complaint.score;

      if (
        complaint.score >=
        75
      ) {
        item.highConcern +=
          1;
      }

      item.platforms[
        result.platform
      ] =
        (
          item.platforms[
            result.platform
          ] ||
          0
        ) +
        1;

      if (
        item.examples.length <
        5
      ) {
        item.examples.push(
          {
            personaId:
              result.personaId,
            label:
              result.label,
            score:
              complaint.score
          }
        );
      }
    }
  }

  const ranked =
    Array.from(
      issueMap.values()
    )
      .map(
        item => ({
          ...item,
          affectedRate:
            item.affected /
            Math.max(
              1,
              personas.length
            ),
          averageScore:
            item.affected
              ? item.totalScore /
                item.affected
              : 0
        })
      )
      .sort(
        (
          a,
          b
        ) => {
          const pa =
            ISSUE_WEIGHTS[
              a.priority
            ] ||
            1;

          const pb =
            ISSUE_WEIGHTS[
              b.priority
            ] ||
            1;

          return (
            pb *
              b.affectedRate *
              b.averageScore -
            pa *
              a.affectedRate *
              a.averageScore
          );
        }
      );

  const riskCounts = {
    '极高':
      0,
    '高':
      0,
    '中':
      0,
    '低':
      0
  };

  for (
    const result of
    results
  ) {
    riskCounts[
      result.churnRisk
    ] +=
      1;
  }

  return {
    results,
    ranked,
    riskCounts
  };
}

module.exports = {
  evaluatePersona,
  aggregate
};
