# Test Individual Container Filtering

This file is created to test that path-based filtering works correctly for individual containers.

Since this file is only in the `containers/bunkbot/` directory and doesn't affect shared code, workflows, or Docker configurations, only the BunkBot container should be built when this file is changed.

This demonstrates the CI/CD optimization working as intended.
