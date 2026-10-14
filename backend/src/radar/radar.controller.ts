import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { RadarService } from './radar.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('radar')
@UseGuards(JwtAuthGuard)
export class RadarController {
  constructor(private readonly service: RadarService) {}

  // 1. Connection check with live Egyptian Government portal
  @Get('status')
  checkStatus() {
    return this.service.checkConnection();
  }

  // 2. Trigger on-demand live radar crawl/scan
  @Post('scan')
  scan(@Body('pagesCount') pagesCount?: number) {
    return this.service.scan(pagesCount ? Number(pagesCount) : 2);
  }

  // Auto-scan daily config
  @Get('auto-scan-config')
  getAutoScanConfig() {
    return this.service.getAutoScanConfig();
  }

  @Post('auto-scan-config')
  updateAutoScanConfig(@Body() body: { enabled: boolean; scheduledTime?: string }) {
    return this.service.updateAutoScanConfig(body.enabled, body.scheduledTime);
  }

  // 3. Radar KPIs & Statistics
  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  // 4. Sources
  @Get('sources')
  findAllSources() {
    return this.service.findAllSources();
  }

  // 5. List items with filters
  @Get('items')
  findAllItems(
    @Query('sourceId') sourceId?: string,
    @Query('isImported') isImported?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('companyCode') companyCode?: string,
    @Query('onlyActive') onlyActive?: string,
    @Query('sortBy') sortBy?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.service.findAllItems({
      sourceId,
      isImported: isImported === 'true' ? true : isImported === 'false' ? false : undefined,
      search,
      category,
      companyCode,
      onlyActive: onlyActive === 'true' ? true : onlyActive === 'false' ? false : undefined,
      sortBy,
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
    });
  }

  // 6. Single item details with full breakdown
  @Get('items/:id')
  findOneItem(@Param('id') id: string) {
    return this.service.findOneItem(id);
  }

  // 7. Convert radar tender directly into GoldenERP Operation
  @Post('items/:id/convert')
  convertToOperation(
    @Param('id') id: string,
    @Body() payload: { companyCode?: string; notes?: string },
    @Req() req: any,
  ) {
    return this.service.convertToOperation(id, payload, req.user?.sub);
  }

  // 8. Archive booklet or attachment into operation's documents
  @Post('items/:id/archive')
  archiveDocumentToOperation(
    @Param('id') id: string,
    @Body() payload: { operationId?: string; docId?: string; fileName?: string },
  ) {
    return this.service.archiveDocumentToOperation(id, payload);
  }

  // 9a. Delete all items matched to Company D
  @Delete('clean-d')
  cleanCompanyDItems() {
    return this.service.cleanCompanyDItems();
  }

  @Delete('items/clean-d')
  cleanCompanyDItemsAlt() {
    return this.service.cleanCompanyDItems();
  }

  // 9ab. Reset all company suggestions / pre-assignments from pending radar items
  @Post('reset-company-assignments')
  resetCompanyAssignments() {
    return this.service.resetCompanyAssignments();
  }

  @Post('items/reset-company-assignments')
  resetCompanyAssignmentsAlt() {
    return this.service.resetCompanyAssignments();
  }

  // 9b. Clear all pending captured items from radar
  @Delete('clear-pending')
  clearPendingItems() {
    return this.service.clearPendingItems();
  }

  @Delete('items/clear-pending')
  clearPendingItemsAlt() {
    return this.service.clearPendingItems();
  }

  // 9c. Delete single radar item
  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.service.deleteItem(id);
  }

  // 10. Download or preview attachment document directly from government portal or synthesized official booklet
  @Get('download-doc')
  async downloadDoc(
    @Query('docId') docId: string,
    @Query('tenderId') tenderId: string,
    @Query('download') download: string,
    @Res() res: any,
  ) {
    if (!docId && !tenderId) {
      return res.status(400).send('معرف المستند docId أو معرف المناقصة tenderId مطلوب');
    }
    try {
      const file = await this.service.downloadDocument(docId, tenderId);
      res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
      const filenameEnc = encodeURIComponent(file.filename);
      const disposition = download === 'true' ? 'attachment' : 'inline';
      res.setHeader(
        'Content-Disposition',
        `${disposition}; filename="${filenameEnc}"; filename*=UTF-8''${filenameEnc}`,
      );
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, X-File-Name');
      res.setHeader('X-File-Name', filenameEnc);
      res.setHeader('Content-Length', file.buffer.length);
      return res.end(file.buffer);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'فشل تحميل كراسة الشروط أو المستند' });
    }
  }

  // 11. Sync all radar timeline dates to operations
  @Post('sync-dates')
  async syncRadarDates(@Query('operationId') operationId?: string) {
    return this.service.syncRadarDatesToOperations(operationId);
  }
}
