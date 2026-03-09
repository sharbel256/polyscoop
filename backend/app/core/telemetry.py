"""OpenTelemetry setup — ships logs, metrics, and traces to Grafana Cloud over OTLP/HTTP."""

import logging
import os
from collections.abc import Callable

from app.core.config import settings

logger = logging.getLogger(__name__)


def setup_telemetry(app) -> Callable[[], None] | None:  # noqa: ANN001
    """Instrument the FastAPI app with OpenTelemetry exporters.

    Returns a shutdown callable, or None if OTEL is disabled.
    """
    if not settings.OTEL_ENABLED:
        logger.debug("OTEL_ENABLED is false — telemetry disabled")
        return None

    if not settings.OTEL_EXPORTER_OTLP_ENDPOINT:
        logger.warning("OTEL_ENABLED is true but OTEL_EXPORTER_OTLP_ENDPOINT is not set")
        return None

    from opentelemetry import metrics, trace
    from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
    from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
    from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    resource = Resource.create(
        {
            "service.name": settings.OTEL_SERVICE_NAME,
            "deployment.environment": os.getenv("ENVIRONMENT", "development"),
        }
    )

    endpoint = settings.OTEL_EXPORTER_OTLP_ENDPOINT
    headers = _parse_headers(settings.OTEL_EXPORTER_OTLP_HEADERS)

    # ── Traces ────────────────────────────────────────────
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces", headers=headers)
        )
    )
    trace.set_tracer_provider(tracer_provider)

    # ── Metrics ───────────────────────────────────────────
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=f"{endpoint}/v1/metrics", headers=headers),
        export_interval_millis=60_000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # ── Logs ──────────────────────────────────────────────
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(
            OTLPLogExporter(endpoint=f"{endpoint}/v1/logs", headers=headers)
        )
    )
    otel_handler = LoggingHandler(level=logging.NOTSET, logger_provider=logger_provider)
    logging.getLogger().addHandler(otel_handler)

    # ── FastAPI auto-instrumentation ──────────────────────
    FastAPIInstrumentor.instrument_app(app)

    logger.info("opentelemetry enabled — exporting to %s", endpoint)

    def shutdown() -> None:
        tracer_provider.shutdown()
        meter_provider.shutdown()
        logger_provider.shutdown()

    return shutdown


def _parse_headers(raw: str) -> dict[str, str]:
    """Parse OTLP header string ('Key1=Value1,Key2=Value2') into a dict.

    Values may be URL-encoded per the OTEL spec (e.g. Basic%20xxx).
    """
    if not raw:
        return {}
    from urllib.parse import unquote

    headers: dict[str, str] = {}
    for pair in raw.split(","):
        if "=" in pair:
            key, value = pair.split("=", 1)
            headers[key.strip()] = unquote(value.strip())
    return headers
