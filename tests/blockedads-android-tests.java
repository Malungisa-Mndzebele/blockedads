package com.blockedads.app;

import org.junit.Test;
import org.junit.Before;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import android.content.Context;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;
import java.net.URI;
import java.util.regex.Pattern;
import static org.junit.Assert.*;
import static org.mockito.Mockito.*;

/**
 * BlockedAds Android App Unit Tests
 * Tests uBlock Origin-inspired functionality of the Android ad blocking components
 */
@RunWith(RobolectricTestRunner.class)
public class BlockedAdsAndroidTests {

    @Mock
    private WebView mockWebView;
    
    @Mock
    private WebResourceRequest mockRequest;
    
    private Context context;
    private BlockedAdsWebViewClient webViewClient;
    private BlockedAdsStats stats;
    private YouTubeBrowserActivity.YouTubeAdBlocker adBlocker;
    
    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        context = RuntimeEnvironment.getApplication();
        webViewClient = new BlockedAdsWebViewClient();
        stats = new BlockedAdsStats(context);
        adBlocker = new YouTubeBrowserActivity.YouTubeAdBlocker();
    }
    
    @Test
    public void testWebViewClientInitialization() {
        assertNotNull("WebViewClient should be initialized", webViewClient);
    }
    
    @Test
    public void testStatsInitialization() {
        assertNotNull("Stats should be initialized", stats);
        assertEquals("Initial ads blocked should be 0", 0, stats.getAdsBlocked());
        assertEquals("Initial data saved should be 0.0", 0.0, stats.getDataSaved(), 0.01);
        assertEquals("Initial YouTube sessions should be 0", 0, stats.getYouTubeSessions());
    }
    
    @Test
    public void testStatsIncrement() {
        stats.incrementAdsBlocked();
        assertEquals("Ads blocked should increment", 1, stats.getAdsBlocked());
        
        stats.addDataSaved(0.1);
        assertEquals("Data saved should increase", 0.1, stats.getDataSaved(), 0.01);
        
        stats.incrementYouTubeSessions();
        assertEquals("YouTube sessions should increment", 1, stats.getYouTubeSessions());
    }
    
    @Test
    public void testStatsPersistence() {
        // Set some stats
        stats.incrementAdsBlocked();
        stats.addDataSaved(0.5);
        stats.incrementYouTubeSessions();
        
        // Create new stats instance to test persistence
        BlockedAdsStats newStats = new BlockedAdsStats(context);
        
        assertEquals("Ads blocked should persist", 1, newStats.getAdsBlocked());
        assertEquals("Data saved should persist", 0.5, newStats.getDataSaved(), 0.01);
        assertEquals("YouTube sessions should persist", 1, newStats.getYouTubeSessions());
    }
    
    @Test
    public void testStatsReset() {
        // Set some stats
        stats.incrementAdsBlocked();
        stats.addDataSaved(0.5);
        stats.incrementYouTubeSessions();
        
        // Reset stats
        stats.resetStats();
        
        assertEquals("Ads blocked should be reset", 0, stats.getAdsBlocked());
        assertEquals("Data saved should be reset", 0.0, stats.getDataSaved(), 0.01);
        assertEquals("YouTube sessions should be reset", 0, stats.getYouTubeSessions());
    }
    
    @Test
    public void testStatsFormattedOutput() {
        stats.incrementAdsBlocked();
        stats.addDataSaved(0.05);
        stats.incrementYouTubeSessions();
        
        String formattedStats = stats.getFormattedStats();
        
        assertTrue("Formatted stats should contain ads blocked", formattedStats.contains("Ads Blocked: 1"));
        assertTrue("Formatted stats should contain data saved", formattedStats.contains("Data Saved: 0.05"));
        assertTrue("Formatted stats should contain YouTube sessions", formattedStats.contains("YouTube Sessions: 1"));
        assertTrue("Formatted stats should contain runtime", formattedStats.contains("Runtime:"));
    }
    
    @Test
    public void testAdBlocking() throws Exception {
        // Mock a Google Ads request
        when(mockRequest.getUrl()).thenReturn(URI.create("https://googleadservices.com/pagead/ads").toURL());
        
        WebResourceResponse response = webViewClient.shouldInterceptRequest(mockWebView, mockRequest);
        
        assertNotNull("Response should not be null", response);
        assertEquals("Should block ad requests", "text/plain", response.getMimeType());
    }
    
    @Test
    public void testLegitimateRequestNotBlocked() throws Exception {
        // Mock a legitimate request
        when(mockRequest.getUrl()).thenReturn(URI.create("https://google.com/search").toURL());
        
        WebResourceResponse response = webViewClient.shouldInterceptRequest(mockWebView, mockRequest);
        
        // Should return null to allow the request
        assertNull("Legitimate requests should not be blocked", response);
    }
    
    @Test
    public void testFacebookAdsBlocked() throws Exception {
        when(mockRequest.getUrl()).thenReturn(URI.create("https://facebook.com/tr").toURL());
        
        WebResourceResponse response = webViewClient.shouldInterceptRequest(mockWebView, mockRequest);
        
        assertNotNull("Facebook ads should be blocked", response);
        assertEquals("Should block Facebook ads", "text/plain", response.getMimeType());
    }
    
    @Test
    public void testAmazonAdsBlocked() throws Exception {
        when(mockRequest.getUrl()).thenReturn(URI.create("https://amazon-adsystem.com/ads").toURL());
        
        WebResourceResponse response = webViewClient.shouldInterceptRequest(mockWebView, mockRequest);
        
        assertNotNull("Amazon ads should be blocked", response);
        assertEquals("Should block Amazon ads", "text/plain", response.getMimeType());
    }
    
    @Test
    public void testTwitterAdsBlocked() throws Exception {
        when(mockRequest.getUrl()).thenReturn(URI.create("https://ads-twitter.com/ads").toURL());
        
        WebResourceResponse response = webViewClient.shouldInterceptRequest(mockWebView, mockRequest);
        
        assertNotNull("Twitter ads should be blocked", response);
        assertEquals("Should block Twitter ads", "text/plain", response.getMimeType());
    }
    
    @Test
    public void testDoubleClickBlocked() throws Exception {
        when(mockRequest.getUrl()).thenReturn(URI.create("https://doubleclick.net/ads").toURL());
        
        WebResourceResponse response = webViewClient.shouldInterceptRequest(mockWebView, mockRequest);
        
        assertNotNull("DoubleClick ads should be blocked", response);
        assertEquals("Should block DoubleClick ads", "text/plain", response.getMimeType());
    }
    
    @Test
    public void testGoogleAnalyticsBlocked() throws Exception {
        when(mockRequest.getUrl()).thenReturn(URI.create("https://google-analytics.com/analytics.js").toURL());
        
        WebResourceResponse response = webViewClient.shouldInterceptRequest(mockWebView, mockRequest);
        
        assertNotNull("Google Analytics should be blocked", response);
        assertEquals("Should block Google Analytics", "text/plain", response.getMimeType());
    }
    
    @Test
    public void testYouTubeAdDomainsBlocked() throws Exception {
        String[] youtubeAdDomains = {
            "https://googlesyndication.com/ads",
            "https://doubleclick.net/ads",
            "https://googleadservices.com/pagead/ads",
            "https://youtube.com/pagead/ads"
        };
        
        for (String url : youtubeAdDomains) {
            when(mockRequest.getUrl()).thenReturn(URI.create(url).toURL());
            WebResourceResponse response = webViewClient.shouldInterceptRequest(mockWebView, mockRequest);
            assertNotNull("YouTube ad domain should be blocked: " + url, response);
        }
    }
    
    @Test
    public void testStatsUpdateOnBlock() throws Exception {
        int initialAdsBlocked = stats.getAdsBlocked();
        double initialDataSaved = stats.getDataSaved();
        
        when(mockRequest.getUrl()).thenReturn(URI.create("https://googleadservices.com/ads").toURL());
        webViewClient.shouldInterceptRequest(mockWebView, mockRequest);
        
        assertEquals("Ads blocked should increment", initialAdsBlocked + 1, stats.getAdsBlocked());
        assertTrue("Data saved should increase", stats.getDataSaved() > initialDataSaved);
    }
    
    @Test
    public void testPageFinishedListener() {
        BlockedAdsWebViewClient.OnPageFinishedListener listener = mock(BlockedAdsWebViewClient.OnPageFinishedListener.class);
        webViewClient.setOnPageFinishedListener(listener);
        
        webViewClient.onPageFinished(mockWebView, "https://youtube.com");
        
        verify(listener).onPageFinished("https://youtube.com");
    }
    
    @Test
    public void testYouTubeAdBlockerInterface() {
        assertNotNull("YouTube ad blocker should be initialized", adBlocker);
        
        // Test JavaScript interface methods
        adBlocker.recordBlockedAd("pre-roll");
        adBlocker.recordYouTubeSession();
        
        // Verify methods exist and can be called
        assertTrue("recordBlockedAd method should exist", 
                  adBlocker.getClass().getDeclaredMethods().length > 0);
    }
    
    @Test
    public void testFilterEnginePatternMatching() {
        BlockedAdsFilterEngine filterEngine = new BlockedAdsFilterEngine();
        
        // Test various ad URLs (uBlock Origin compatible)
        assertTrue("Should block Google Ads", filterEngine.shouldBlockUrl("https://googleadservices.com/ads"));
        assertTrue("Should block DoubleClick", filterEngine.shouldBlockUrl("https://doubleclick.net/ads"));
        assertTrue("Should block Facebook tracking", filterEngine.shouldBlockUrl("https://facebook.com/tr"));
        assertTrue("Should block Amazon ads", filterEngine.shouldBlockUrl("https://amazon-adsystem.com/ads"));
        assertTrue("Should block Yahoo ads", filterEngine.shouldBlockUrl("https://ads.yahoo.com/ads"));
        assertTrue("Should block Twitter ads", filterEngine.shouldBlockUrl("https://ads-twitter.com/ads"));
        assertTrue("Should block analytics", filterEngine.shouldBlockUrl("https://google-analytics.com/analytics.js"));
        
        // Test legitimate URLs
        assertFalse("Should not block Google search", filterEngine.shouldBlockUrl("https://google.com/search"));
        assertFalse("Should not block regular websites", filterEngine.shouldBlockUrl("https://example.com/page"));
        assertFalse("Should not block YouTube content", filterEngine.shouldBlockUrl("https://youtube.com/watch?v=test"));
    }
    
    @Test
    public void testYouTubeSpecificBlocking() {
        BlockedAdsFilterEngine filterEngine = new BlockedAdsFilterEngine();
        
        // Test YouTube-specific ad blocking
        String[] youtubeAdUrls = {
            "https://googlesyndication.com/pagead/ads",
            "https://doubleclick.net/ads",
            "https://googleadservices.com/pagead/ads",
            "https://youtube.com/pagead/ads"
        };
        
        for (String url : youtubeAdUrls) {
            assertTrue("Should block YouTube ad URL: " + url, filterEngine.shouldBlockUrl(url));
        }
    }
    
    @Test
    public void testPerformanceWithManyRequests() {
        BlockedAdsFilterEngine filterEngine = new BlockedAdsFilterEngine();
        
        long startTime = System.currentTimeMillis();
        
        // Test 1000 URL checks (uBlock Origin performance target)
        for (int i = 0; i < 1000; i++) {
            filterEngine.shouldBlockUrl("https://example" + i + ".com/ads");
        }
        
        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;
        
        // Should complete in less than 100ms (uBlock Origin performance)
        assertTrue("URL checking should be fast", duration < 100);
    }
    
    @Test
    public void testMemoryUsage() {
        Runtime runtime = Runtime.getRuntime();
        long initialMemory = runtime.totalMemory() - runtime.freeMemory();
        
        // Create multiple filter engines
        for (int i = 0; i < 100; i++) {
            new BlockedAdsFilterEngine();
        }
        
        long finalMemory = runtime.totalMemory() - runtime.freeMemory();
        long memoryIncrease = finalMemory - initialMemory;
        
        // Memory increase should be reasonable (uBlock Origin target: <20MB)
        assertTrue("Memory usage should be reasonable", memoryIncrease < 20 * 1024 * 1024);
    }
    
    @Test
    public void testEdgeCases() throws Exception {
        // Test null URL
        when(mockRequest.getUrl()).thenReturn(null);
        WebResourceResponse response = webViewClient.shouldInterceptRequest(mockWebView, mockRequest);
        assertNull("Null URL should not cause errors", response);
        
        // Test empty URL
        when(mockRequest.getUrl()).thenReturn(URI.create("").toURL());
        response = webViewClient.shouldInterceptRequest(mockWebView, mockRequest);
        assertNull("Empty URL should not cause errors", response);
        
        // Test malformed URL
        when(mockRequest.getUrl()).thenReturn(URI.create("not-a-valid-url").toURL());
        response = webViewClient.shouldInterceptRequest(mockWebView, mockRequest);
        assertNull("Malformed URL should not cause errors", response);
    }
    
    @Test
    public void testConcurrentAccess() throws InterruptedException {
        final int numThreads = 10;
        final int requestsPerThread = 100;
        final Thread[] threads = new Thread[numThreads];
        
        for (int i = 0; i < numThreads; i++) {
            threads[i] = new Thread(() -> {
                for (int j = 0; j < requestsPerThread; j++) {
                    stats.incrementAdsBlocked();
                    stats.addDataSaved(0.01);
                    stats.incrementYouTubeSessions();
                }
            });
        }
        
        // Start all threads
        for (Thread thread : threads) {
            thread.start();
        }
        
        // Wait for all threads to complete
        for (Thread thread : threads) {
            thread.join();
        }
        
        assertEquals("Concurrent access should work correctly", 
                    numThreads * requestsPerThread, stats.getAdsBlocked());
        assertEquals("YouTube sessions should work correctly", 
                    numThreads * requestsPerThread, stats.getYouTubeSessions());
    }
    
    @Test
    public void testRuntimeCalculation() {
        // Test runtime calculation
        long runtime = stats.getRuntimeMinutes();
        assertTrue("Runtime should be non-negative", runtime >= 0);
        
        // Test formatted stats include runtime
        String formattedStats = stats.getFormattedStats();
        assertTrue("Formatted stats should include runtime", formattedStats.contains("Runtime:"));
    }
    
    @Test
    public void testDailyStatistics() {
        // Test daily statistics (for MVP, returns total)
        int dailyAds = stats.getDailyAdsBlocked();
        double dailyData = stats.getDailyDataSaved();
        
        assertTrue("Daily ads should be non-negative", dailyAds >= 0);
        assertTrue("Daily data should be non-negative", dailyData >= 0);
    }
    
    @Test
    public void testuBlockOriginCompatibility() {
        BlockedAdsFilterEngine filterEngine = new BlockedAdsFilterEngine();
        
        // Test uBlock Origin compatible ad domains
        String[] uBlockDomains = {
            "googleadservices.com",
            "googlesyndication.com",
            "doubleclick.net",
            "facebook.com",
            "amazon-adsystem.com",
            "ads.yahoo.com",
            "adsystem.yahoo.com",
            "ads-twitter.com",
            "twitter.com",
            "scorecardresearch.com",
            "quantserve.com",
            "outbrain.com"
        };
        
        for (String domain : uBlockDomains) {
            String url = "https://" + domain + "/ads";
            assertTrue("Should block uBlock Origin domain: " + domain, filterEngine.shouldBlockUrl(url));
        }
    }
}