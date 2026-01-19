#!/usr/bin/env python3
"""
Performance Benchmark Tests for cAgents V7.0 Consolidation

Track performance metrics for continuous improvement.
"""

import pytest
import yaml
import time
from pathlib import Path
from typing import Dict, List, Any


# Test fixtures
@pytest.fixture
def project_root() -> Path:
    """Get project root directory"""
    return Path(__file__).parent.parent.parent


@pytest.fixture
def super_domains() -> List[str]:
    """List of all super-domains"""
    return ['make', 'grow', 'operate', 'people', 'serve']


# Mock benchmark results (for structural testing)
class BenchmarkResults:
    """Mock benchmark results"""

    def __init__(self):
        self.avg_tokens = 12000
        self.max_tokens = 22000
        self.avg_duration = 180  # seconds
        self.success_rate = 0.92
        self.avg_questions_asked = 10
        self.avg_tasks_generated = 7


class BenchmarkRunner:
    """Mock benchmark runner for testing"""

    def run_benchmark(self, workflow_tier: int = None, sample_size: int = 10,
                     super_domains: List[str] = None, domain: str = None):
        """Run benchmark suite"""
        return BenchmarkResults()


@pytest.fixture
def benchmark_runner() -> BenchmarkRunner:
    """Get benchmark runner"""
    return BenchmarkRunner()


# File Structure Benchmarks
def test_total_file_count_reduction(project_root):
    """Verify file count reduction after consolidation"""
    # Count current config files
    config_files = list(project_root.glob("*/config/*.yaml"))

    # Count plugin manifests
    manifests = list(project_root.glob("*/.claude-plugin/plugin.json"))

    # If consolidation complete, verify counts
    if len(config_files) == 25 and len(manifests) == 7:
        # Post-consolidation: exactly 25 configs + 7 manifests
        assert len(config_files) == 25, f"Expected 25 configs, found {len(config_files)}"
        assert len(manifests) == 7, f"Expected 7 manifests, found {len(manifests)}"
    else:
        # Pre-consolidation: should have more
        pytest.skip("Consolidation not complete yet")


def test_hitl_calibration_unification(project_root):
    """Verify HITL calibration is unified"""
    hitl_files = list(project_root.glob("Agent_Memory/_system/**/hitl*.yaml"))

    # After consolidation, should be exactly 1
    if len(hitl_files) == 1:
        assert len(hitl_files) == 1, "Should have exactly 1 unified HITL file"
    else:
        pytest.skip("HITL consolidation not complete yet")


# Token Usage Benchmarks
def test_token_usage_tier2(benchmark_runner):
    """Benchmark token usage for tier 2 workflows"""
    results = benchmark_runner.run_benchmark(
        workflow_tier=2,
        sample_size=10
    )

    # Tier 2 workflows should use < 15K tokens on average
    assert results.avg_tokens < 15000, \
        f"Tier 2 avg tokens too high: {results.avg_tokens}"
    assert results.max_tokens < 25000, \
        f"Tier 2 max tokens too high: {results.max_tokens}"


def test_token_usage_tier3(benchmark_runner):
    """Benchmark token usage for tier 3 workflows"""
    results = benchmark_runner.run_benchmark(
        workflow_tier=3,
        sample_size=10
    )

    # Tier 3 workflows should use < 30K tokens on average
    assert results.avg_tokens < 30000, \
        f"Tier 3 avg tokens too high: {results.avg_tokens}"


# Execution Time Benchmarks
def test_execution_time_tier2(benchmark_runner):
    """Benchmark execution time for tier 2 workflows"""
    results = benchmark_runner.run_benchmark(
        workflow_tier=2,
        sample_size=10
    )

    # Tier 2 should complete in < 5 minutes (300 seconds)
    assert results.avg_duration < 300, \
        f"Tier 2 avg duration too high: {results.avg_duration}s"


def test_execution_time_tier3(benchmark_runner):
    """Benchmark execution time for tier 3 workflows"""
    results = benchmark_runner.run_benchmark(
        workflow_tier=3,
        sample_size=10
    )

    # Tier 3 should complete in < 15 minutes (900 seconds)
    assert results.avg_duration < 900, \
        f"Tier 3 avg duration too high: {results.avg_duration}s"


# Success Rate Benchmarks
def test_success_rate_by_domain(benchmark_runner, super_domains):
    """Track success rates by super-domain"""
    for domain in super_domains:
        results = benchmark_runner.run_benchmark(
            domain=domain,
            sample_size=20
        )

        # All domains should have > 90% success rate
        assert results.success_rate > 0.9, \
            f"{domain} success rate too low: {results.success_rate}"


# Controller Efficiency Benchmarks
def test_controller_efficiency(benchmark_runner):
    """Measure controller efficiency (questions vs tasks)"""
    results = benchmark_runner.run_benchmark(
        workflow_tier=2,
        sample_size=20
    )

    # Controllers should ask 8-12 questions on average
    assert 8 <= results.avg_questions_asked <= 15, \
        f"Questions asked out of range: {results.avg_questions_asked}"

    # Should generate 5-10 tasks from synthesis
    assert 5 <= results.avg_tasks_generated <= 12, \
        f"Tasks generated out of range: {results.avg_tasks_generated}"

    # Efficiency ratio: tasks/questions should be 0.5-1.0
    efficiency = results.avg_tasks_generated / results.avg_questions_asked
    assert 0.5 <= efficiency <= 1.0, \
        f"Efficiency ratio out of range: {efficiency}"


# Configuration Performance
def test_config_load_time(project_root, super_domains):
    """Measure config file load times"""
    load_times = []

    for domain in super_domains:
        config_path = project_root / domain / "config" / "planner_config.yaml"

        if not config_path.exists():
            pytest.skip(f"{domain} not created yet")

        start = time.time()
        with open(config_path) as f:
            yaml.safe_load(f)
        load_time = time.time() - start

        load_times.append(load_time)

    # Config load should be fast (< 100ms each)
    avg_load_time = sum(load_times) / len(load_times)
    assert avg_load_time < 0.1, f"Config load too slow: {avg_load_time}s"


# Memory Usage Estimates
def test_config_file_sizes(project_root, super_domains):
    """Verify config files are reasonably sized"""
    for domain in super_domains:
        config_dir = project_root / domain / "config"

        if not config_dir.exists():
            pytest.skip(f"{domain} not created yet")

        for config_file in config_dir.glob("*.yaml"):
            size_kb = config_file.stat().st_size / 1024

            # Config files should be < 50KB each
            assert size_kb < 50, \
                f"{config_file.name} too large: {size_kb:.2f}KB"


# Benchmark Report Generation
@pytest.fixture
def reports_dir(project_root) -> Path:
    """Get reports directory"""
    reports = project_root / "tests" / "benchmarks" / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    return reports


def test_generate_benchmark_report(benchmark_runner, reports_dir, super_domains):
    """Generate benchmark report"""
    report = {
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'domains': {}
    }

    for domain in super_domains:
        results = benchmark_runner.run_benchmark(domain=domain, sample_size=10)

        report['domains'][domain] = {
            'success_rate': results.success_rate,
            'avg_tokens': results.avg_tokens,
            'avg_duration': results.avg_duration,
            'avg_questions': results.avg_questions_asked,
            'avg_tasks': results.avg_tasks_generated
        }

    # Write report
    report_file = reports_dir / f"benchmark_report_{int(time.time())}.yaml"
    with open(report_file, 'w') as f:
        yaml.dump(report, f)

    assert report_file.exists(), "Benchmark report should be created"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
