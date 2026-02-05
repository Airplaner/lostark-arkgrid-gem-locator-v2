# 아크 그리드 전투력 최적화

## Introduction

이 프로젝트는 로스트아크 아크 그리드 시스템에서 사용자가 가진 젬을 코어에 장착했을 때 전투력을 최대화하는 최적의 조합을 탐색하는 계산 사이트입니다.

## Key Features
- 장착 가능한 젬 조합을 직접 비교할 필요 없이 최적의 아크 그리드 배치를 자동으로 계산
- 화면 인식을 통한 젬 자동 입력으로 반복 작업 최소화
- 여러 캐릭터를 프로필로 관리 가능

## Tech Stack

- **Solver**: Custom backtracking with upper bound pruning (TypeScript)
- **Frontend**: Svelte (component-based UI, local state persistence)
- **Image Processing**: OpenCV (template matching, Web Worker)
- **Deployment**: GitHub Pages (fully client-side)

## Technical Deep Dive
- [Solving](docs/algorithm.md)
- [Screen Recognition](docs/opencv.md)
