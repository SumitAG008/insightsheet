import io
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class ChartBuildResult:
    xlsx_bytes: bytes


class XlsxChartService:
    def __init__(self):
        try:
            import xlsxwriter  # noqa: F401
        except Exception as e:
            raise RuntimeError("XlsxWriter is not available") from e

    def build_workbook_from_dataframe(self, df, chart_plan_json: str) -> ChartBuildResult:
        try:
            plan = json.loads(chart_plan_json) if chart_plan_json else {}
        except Exception as e:
            raise ValueError("chart_json must be valid JSON") from e

        charts = plan.get("charts") or []
        if not isinstance(charts, list):
            raise ValueError("chart_json.charts must be an array")

        import pandas as pd
        import xlsxwriter

        output = io.BytesIO()
        wb = xlsxwriter.Workbook(output, {"in_memory": True})

        sheet_counter = 0

        data_ws = wb.add_worksheet("Data")
        dash_ws = wb.add_worksheet(plan.get("dashboard_sheet") or "Dashboard")

        header_fmt = wb.add_format({"bold": True, "bg_color": "#1F2937", "font_color": "#FFFFFF"})
        num_fmt = wb.add_format({"num_format": "#,##0.00"})

        df2 = df.copy()
        for c in df2.columns:
            if pd.api.types.is_datetime64_any_dtype(df2[c]):
                df2[c] = df2[c].dt.strftime("%Y-%m-%d")

        for col_idx, col_name in enumerate(list(df2.columns)):
            data_ws.write(0, col_idx, str(col_name), header_fmt)

        for r in range(len(df2)):
            row = df2.iloc[r]
            for cidx, col_name in enumerate(list(df2.columns)):
                v = row[col_name]
                if v is None or (isinstance(v, float) and pd.isna(v)):
                    data_ws.write(r + 1, cidx, "")
                elif isinstance(v, (int, float)) and not pd.isna(v):
                    data_ws.write_number(r + 1, cidx, float(v), num_fmt)
                else:
                    data_ws.write(r + 1, cidx, str(v))

        for i, col_name in enumerate(list(df2.columns)):
            try:
                max_len = max([len(str(col_name))] + [len(str(x)) for x in df2[col_name].head(200).tolist()])
            except Exception:
                max_len = len(str(col_name))
            data_ws.set_column(i, i, min(max(10, max_len + 2), 40))

        dash_ws.set_column(0, 20, 18)

        def _col_idx(name: str) -> int:
            if name not in df2.columns:
                raise ValueError(f"Unknown column '{name}'")
            return int(list(df2.columns).index(name))

        def _cell_range(sheet: str, row0: int, col0: int, row1: int, col1: int) -> List[Any]:
            return [sheet, row0, col0, row1, col1]

        for chart_spec in charts:
            if not isinstance(chart_spec, dict):
                raise ValueError("Each chart spec must be an object")

            ctype = (chart_spec.get("type") or "").strip().lower()
            title = chart_spec.get("title")
            position = (chart_spec.get("position") or "B2").strip()

            if ctype not in ("bar", "line", "pie", "scatter", "histogram", "box"):
                raise ValueError("chart type must be bar|line|pie|scatter|histogram|box")

            if ctype == "histogram":
                value_col = chart_spec.get("value_col")
                if not value_col:
                    raise ValueError("histogram.value_col is required")

                bins = chart_spec.get("bins")
                if bins is None:
                    bins = 20
                try:
                    bins = int(bins)
                except Exception:
                    bins = 20
                bins = max(5, min(bins, 50))

                s = pd.to_numeric(df[value_col], errors="coerce").dropna()
                if s.empty:
                    raise ValueError("Histogram has no numeric values")

                counts, edges = pd.cut(s, bins=bins, retbins=True, include_lowest=True)
                freq = counts.value_counts().sort_index()

                hist_df = pd.DataFrame(
                    {
                        "bin": [str(x) for x in freq.index.astype(str)],
                        "count": [int(x) for x in freq.values.tolist()],
                    }
                )

                sheet_counter += 1
                sheet_name = f"Hist_{sheet_counter}"
                hist_ws = wb.add_worksheet(sheet_name[:31])
                hist_ws.write(0, 0, "bin", header_fmt)
                hist_ws.write(0, 1, "count", header_fmt)
                for rr in range(len(hist_df)):
                    hist_ws.write(rr + 1, 0, hist_df.iloc[rr]["bin"])
                    hist_ws.write_number(rr + 1, 1, float(hist_df.iloc[rr]["count"]))

                chart = wb.add_chart({"type": "column"})
                chart.set_title({"name": title or f"Histogram of {value_col}"})
                chart.add_series(
                    {
                        "categories": _cell_range(sheet_name[:31], 1, 0, len(hist_df), 0),
                        "values": _cell_range(sheet_name[:31], 1, 1, len(hist_df), 1),
                    }
                )
                chart.set_legend({"none": True})
                dash_ws.insert_chart(position, chart, {"x_scale": 1.5, "y_scale": 1.4})
                continue

            x_col = chart_spec.get("x_col")
            y_col = chart_spec.get("y_col")
            category_col = chart_spec.get("category_col")
            series_col = chart_spec.get("series_col")

            top_n = chart_spec.get("top_n")
            if top_n is not None:
                try:
                    top_n = int(top_n)
                except Exception:
                    top_n = None

            working_df = df.copy()

            if ctype in ("bar", "pie") and category_col and y_col:
                g = working_df.groupby(category_col, dropna=False)[y_col].sum().reset_index()
                g = g.sort_values(y_col, ascending=False)
                if top_n:
                    head = g.head(top_n)
                    tail = g.iloc[top_n:]
                    if not tail.empty:
                        other_val = float(tail[y_col].sum())
                        head = pd.concat([head, pd.DataFrame([{category_col: "Other", y_col: other_val}])], ignore_index=True)
                    g = head
                working_df = g
                x_col = category_col

            if ctype in ("line", "scatter") and x_col and y_col:
                pass

            if not x_col and not category_col:
                raise ValueError("x_col or category_col is required")
            if not y_col and ctype != "pie":
                raise ValueError("y_col is required")

            # write per-chart dataset to its own sheet
            sheet_counter += 1
            sheet_name = (chart_spec.get("data_sheet") or f"ChartData_{sheet_counter}")
            sheet_name = sheet_name[:31]
            c_ws = wb.add_worksheet(sheet_name)

            cols = []
            if x_col:
                cols.append(x_col)
            if y_col:
                cols.append(y_col)
            if series_col and series_col not in cols:
                cols.append(series_col)

            for ci, cn in enumerate(cols):
                c_ws.write(0, ci, str(cn), header_fmt)

            for rr in range(len(working_df)):
                for ci, cn in enumerate(cols):
                    v = working_df.iloc[rr][cn]
                    if v is None or (isinstance(v, float) and pd.isna(v)):
                        c_ws.write(rr + 1, ci, "")
                    elif isinstance(v, (int, float)) and not pd.isna(v):
                        c_ws.write_number(rr + 1, ci, float(v), num_fmt)
                    else:
                        c_ws.write(rr + 1, ci, str(v))

            if ctype == "bar":
                chart = wb.add_chart({"type": "column"})
            elif ctype == "line":
                chart = wb.add_chart({"type": "line"})
            elif ctype == "pie":
                chart = wb.add_chart({"type": "pie"})
            elif ctype == "scatter":
                chart = wb.add_chart({"type": "scatter"})
            elif ctype == "box":
                chart = wb.add_chart({"type": "box"})
            else:
                chart = wb.add_chart({"type": "column"})

            chart.set_title({"name": title or "Chart"})

            x_idx = 0
            y_idx = 1 if len(cols) > 1 else None

            if ctype == "pie":
                if y_idx is None:
                    raise ValueError("pie requires y_col")
                chart.add_series(
                    {
                        "categories": _cell_range(sheet_name, 1, x_idx, len(working_df), x_idx),
                        "values": _cell_range(sheet_name, 1, y_idx, len(working_df), y_idx),
                    }
                )
            else:
                if y_idx is None:
                    raise ValueError("chart requires y_col")
                chart.add_series(
                    {
                        "categories": _cell_range(sheet_name, 1, x_idx, len(working_df), x_idx),
                        "values": _cell_range(sheet_name, 1, y_idx, len(working_df), y_idx),
                    }
                )

            if chart_spec.get("x_axis_title"):
                chart.set_x_axis({"name": str(chart_spec.get("x_axis_title"))})
            if chart_spec.get("y_axis_title"):
                chart.set_y_axis({"name": str(chart_spec.get("y_axis_title"))})

            dash_ws.insert_chart(position, chart, {"x_scale": 1.5, "y_scale": 1.4})

        wb.close()
        output.seek(0)
        return ChartBuildResult(xlsx_bytes=output.read())
